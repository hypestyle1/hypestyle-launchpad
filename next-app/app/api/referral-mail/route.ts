import { NextRequest, NextResponse } from 'next/server';
import { REF_HOLD_DIAS, REF_MIN_COMPRA, REF_VIGENCIA_DIAS, formatRefMonto } from '@/lib/referidos';

// Mails del programa de referidos. Los dispara el mu-plugin
// (PHP/hypestyle-referidos.php) con un token HMAC; acá se resuelve el estado
// contra /credit-status (que verifica la firma), se arma el mail y lo manda
// Brevo. Tres tipos:
//
//   GET /api/referral-mail?type=premio-pendiente&token=<t>&order=<id>
//   GET /api/referral-mail?type=premio-disponible&token=<t>
//   GET /api/referral-mail?type=vencimiento&token=<t>
//
// Seguridad, en tres capas:
//  1. AUTENTICACIÓN server a server: el PHP manda X-Hypestyle-Secret (el mismo
//     secreto con el que el front le habla a WP). Sin header válido, 401 y no
//     se manda nada. Fail closed si WP_SECRET no está configurado.
//  2. VALIDACIÓN DE EVENTO: el tipo pedido tiene que coincidir con el estado
//     real del crédito según el backend (un token de premio pendiente no puede
//     disparar el mail de "disponible", y el de vencimiento solo sale si el
//     cupón sigue vivo y vence dentro de las próximas 48 h).
//  3. IDEMPOTENCIA ATÓMICA Y RECUPERABLE: antes de mandar se reclama el envío
//     en el backend (/referral-mail-claim: INSERT IGNORE + compare-and-swap,
//     una sola operación, sin leer-y-escribir separado). Si Brevo acepta, se
//     confirma (/referral-mail-confirm) y ese mail no sale nunca más; si Brevo
//     falla, el claim queda 'pending' y vence a los 30 minutos, y el barrido
//     diario re-dispara el aviso: ningún mail se pierde ni se duplica.

export const dynamic = 'force-dynamic';

const WP_URL        = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET     = (process.env.WP_SECRET || '').replace(/^﻿/, '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
// Override solo para entornos de prueba (demo local → Mailpit); en producción
// no se setea y queda Brevo real.
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER_EMAIL  = 'pedidos@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

// Claim/confirm contra el backend: una sola operación atómica por mail.
async function mailClaim(accion: 'claim' | 'confirm', key: string): Promise<boolean> {
  const r = await fetch(`${WP_URL}/wp-json/hypestyle/v1/referral-mail-${accion}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hypestyle-Secret': WP_SECRET,
      'Authorization': `Bearer ${WP_SECRET}`,
    },
    body: JSON.stringify({ key }),
    cache: 'no-store',
  });
  const d = await r.json().catch(() => ({}));
  return accion === 'claim' ? !!d?.claimed : !!d?.ok;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fechaLarga = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
};

function layout(titulo: string, intro: string, cuerpo: string, pie: string) {
  // El logo va en una banda negra a sangre, nunca suelto: Gmail en modo oscuro
  // invierte los fondos pero no las imágenes, y un wordmark negro transparente
  // desaparece. La banda queda intencional en los dos modos.
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f5;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;">
    <tr><td style="padding:0;"><img src="${SITE_URL}/mail-hype-band.png" alt="Hypestyle" width="560" style="display:block;width:100%;height:auto;border-radius:10px 10px 0 0;"></td></tr>
    <tr><td style="padding:8px 28px 0;text-align:center;">
      <h1 style="font-size:22px;margin:12px 0 8px;">${titulo}</h1>
      <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">${intro}</p>
    </td></tr>
    <tr><td style="padding:0 28px 28px;">${cuerpo}</td></tr>
    <tr><td style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#777;text-align:center;">
      ${pie}<br>¿Dudas? Escribinos por <a href="https://wa.me/5491178292430" style="color:#0a0a0a;">WhatsApp</a>.
    </td></tr>
  </table></body></html>`;
}

const boton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="background:#0a0a0a;border-radius:9999px;"><a href="${href}" style="display:inline-block;padding:15px 34px;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(label)}</a></td>
  </tr></table>`;

const tarjetaCodigo = (code: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:380px;margin:0 auto 24px;"><tr>
    <td style="background:#0e0e0e;border-radius:10px;padding:22px 24px;color:#ffffff;text-align:center;">
      <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#888;">Tu crédito en hypestyle.com.ar</div>
      <div style="font-family:Consolas,'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:.18em;margin:18px 0;">${esc(code)}</div>
      <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#888;">Se descuenta solo en el checkout, con tu mail</div>
    </td>
  </tr></table>`;

async function sendEmail(to: { email: string; name?: string }, subject: string, html: string) {
  const r = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, replyTo: { name: SENDER_NAME, email: REPLY_TO }, to: [to], subject, htmlContent: html }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export async function GET(req: NextRequest) {
  // Capa 1: solo el backend puede disparar mails. Fail closed.
  const provided = (req.headers.get('x-hypestyle-secret') || '').trim();
  if (!WP_SECRET || provided !== WP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') || '';
  const token = sp.get('token') || '';
  const orderId = parseInt(sp.get('order') || '0', 10) || 0;
  if (!token || !['premio-pendiente', 'premio-disponible', 'vencimiento'].includes(type)) {
    return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
  }
  // Los mails de premio son por pedido: sin pedido no hay dónde anclar la
  // idempotencia, así que no se mandan.
  if (type !== 'vencimiento' && !orderId) {
    return NextResponse.json({ error: 'order faltante' }, { status: 400 });
  }
  if (!BREVO_API_KEY) return NextResponse.json({ error: 'BREVO_API_KEY no configurada' }, { status: 500 });

  // El estado lo resuelve el backend verificando la firma del token.
  const sr = await fetch(`${WP_URL}/wp-json/hypestyle/v1/credit-status?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!sr.ok) return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
  const s = await sr.json();
  const to = { email: String(s.email || ''), name: String(s.nombre || '') || undefined };
  if (!to.email) return NextResponse.json({ ok: false, reason: 'sin-destinatario' });

  // Capa 2: el evento pedido tiene que ser verdad AHORA según el backend.
  const estado = String(s.estado || '');
  if (type === 'premio-pendiente' && estado !== 'pendiente') {
    return NextResponse.json({ ok: false, reason: `estado ${estado}, no pendiente` });
  }
  if (type === 'premio-disponible' && estado !== 'disponible') {
    return NextResponse.json({ ok: false, reason: `estado ${estado}, no disponible` });
  }
  if (type === 'vencimiento') {
    const venceTs = s.vence ? new Date(`${s.vence}T23:59:59`).getTime() : 0;
    const vivo = estado === 'disponible' && Number(s.saldo) > 0;
    // 72 h sobre el FIN del día de vencimiento = la ventana de 48 h que mide el
    // backend sobre su INICIO (el barrido dispara cuando faltan ≤48 h para las
    // 00:00 del día que vence). Con 48 acá, la primera pasada del barrido caía
    // "fuera de ventana" y el aviso quedaba sin reintento si Brevo fallaba.
    const enVentana = venceTs > Date.now() && venceTs - Date.now() <= 72 * 3600_000;
    if (!vivo || !enVentana) return NextResponse.json({ ok: false, reason: 'fuera de ventana' });
  }

  // Capa 3: claim atómico en el backend. Perdió el claim = alguien más lo
  // mandó (o lo está mandando): salida limpia sin duplicado. Si WP no
  // contesta, no hay reserva: no se manda nada y el barrido reintenta.
  const claimKey = `${type}_${orderId || String(s.coupon || '')}`.toLowerCase();
  const claimed = await mailClaim('claim', claimKey).catch(() => null);
  if (claimed === null) {
    return NextResponse.json({ error: 'claim inaccesible', retry: 'el barrido reintenta' }, { status: 502 });
  }
  if (!claimed) {
    return NextResponse.json({ ok: true, dedup: true });
  }

  const linkCredito = `${SITE_URL}/credito?t=${encodeURIComponent(token)}`;
  const premio = formatRefMonto(Number(s.monto) || 12000);
  const pieComun = `Compra mínima ${formatRefMonto(REF_MIN_COMPRA)}. Se suma al 10% por transferencia; no a otros descuentos ni promociones.`;

  try {
  if (type === 'premio-pendiente') {
    await sendEmail(to, `Tu amigo ya es de Hype: ${premio} en camino`, layout(
      'Tu amigo ya es de Hype',
      `Compró con tu link. Esperamos ${REF_HOLD_DIAS} días por cambios o devoluciones y el ${esc(fechaLarga(s.se_acredita) || 'séptimo día')} tus ${premio} quedan disponibles. Te avisamos por acá.`,
      boton(linkCredito, 'Ver mi crédito'),
      `Desde la acreditación tenés ${REF_VIGENCIA_DIAS} días para usarlo. ${pieComun}`,
    ));
  } else if (type === 'premio-disponible') {
    await sendEmail(to, `Tus ${premio} están acá`, layout(
      `Tus ${premio} están acá`,
      'Gracias por traer a tu amigo. El crédito está atado a tu mail y se descuenta solo en el checkout.',
      tarjetaCodigo(String(s.coupon || '')) + boton(linkCredito, `Usar mis ${premio}`),
      `Vence el ${esc(fechaLarga(s.vence) || `a los ${REF_VIGENCIA_DIAS} días`)}. ${pieComun}`,
    ));
  } else {
    const saldo = formatRefMonto(Number(s.saldo) || Number(s.monto) || 0);
    await sendEmail(to, `Tu crédito de ${saldo} vence pronto`, layout(
      'Tu crédito vence pronto',
      `Te quedan ${saldo} para usar en Hype hasta el ${esc(fechaLarga(s.vence) || 'final del día de mañana')}. Después de eso, se pierde.`,
      tarjetaCodigo(String(s.coupon || '')) + boton(SITE_URL, 'Ir a la tienda'),
      pieComun,
    ));
  }
  } catch (err) {
    // Brevo falló DESPUÉS de reservar: el claim queda 'pending' y vence a los
    // 30 minutos; el barrido diario re-dispara este aviso. Nada se pierde.
    return NextResponse.json({ error: `Brevo: ${String(err).slice(0, 200)}`, retry: 'el claim vence en 30 min y el barrido reintenta' }, { status: 502 });
  }

  await mailClaim('confirm', claimKey).catch(() => { /* el claim pending vence solo; peor caso: un reintento de más, que el claim dedupe */ });

  return NextResponse.json({ ok: true, enviados: [to.email] });
}
