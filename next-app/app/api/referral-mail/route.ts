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
// Idempotencia: los dos de premio quedan marcados con meta en el pedido del
// amigo (el PHP además los dispara desde caminos con candado); el de
// vencimiento lo marca el PHP en el cupón ANTES de llamar.

export const dynamic = 'force-dynamic';

const WP_URL        = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY        = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC        = (process.env.WC_CONSUMER_SECRET || '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER_EMAIL  = 'pedidos@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fechaLarga = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
};

function layout(titulo: string, intro: string, cuerpo: string, pie: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f5;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;">
    <tr><td style="padding:28px 28px 8px;text-align:center;"><img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" height="24" style="height:24px;width:auto;"></td></tr>
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
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, replyTo: { name: SENDER_NAME, email: REPLY_TO }, to: [to], subject, htmlContent: html }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') || '';
  const token = sp.get('token') || '';
  const orderId = parseInt(sp.get('order') || '0', 10) || 0;
  if (!token || !['premio-pendiente', 'premio-disponible', 'vencimiento'].includes(type)) {
    return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
  }
  if (!BREVO_API_KEY) return NextResponse.json({ error: 'BREVO_API_KEY no configurada' }, { status: 500 });

  // El estado lo resuelve el backend verificando la firma del token.
  const sr = await fetch(`${WP_URL}/wp-json/hypestyle/v1/credit-status?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!sr.ok) return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
  const s = await sr.json();
  const to = { email: String(s.email || ''), name: String(s.nombre || '') || undefined };
  if (!to.email) return NextResponse.json({ ok: false, reason: 'sin-destinatario' });

  // Idempotencia de los mails de premio: meta en el pedido del amigo.
  const flag = `_hs_ref_mail_${type}`;
  if (orderId) {
    const or = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
    if (or.ok) {
      const order = await or.json();
      if ((order.meta_data || []).some((m: { key: string }) => m.key === flag)) {
        return NextResponse.json({ ok: true, enviados: [] });
      }
    }
  }

  const linkCredito = `${SITE_URL}/credito?t=${encodeURIComponent(token)}`;
  const premio = formatRefMonto(Number(s.monto) || 12000);
  const pieComun = `Compra mínima ${formatRefMonto(REF_MIN_COMPRA)}. No acumulable con otros descuentos ni promociones.`;

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
    await sendEmail(to, `Tu crédito de ${saldo} vence mañana`, layout(
      'Tu crédito vence mañana',
      `Te quedan ${saldo} para usar en Hype hasta el ${esc(fechaLarga(s.vence) || 'final del día de mañana')}. Después de eso, se pierde.`,
      tarjetaCodigo(String(s.coupon || '')) + boton(SITE_URL, 'Ir a la tienda'),
      pieComun,
    ));
  }

  if (orderId) {
    await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ meta_data: [{ key: flag, value: new Date().toISOString() }] }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, enviados: [to.email] });
}
