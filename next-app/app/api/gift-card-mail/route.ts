import { NextRequest, NextResponse } from 'next/server';
import { formatGiftAmount, giftCardTone, GIFT_CARD_TONE_LABEL, GIFT_CARD_TONE_UNICO, type GiftCardTone } from '@/lib/gift-card';

// Mail de la gift card. Lo dispara el mu-plugin (PHP/hypestyle-gift-cards.php)
// cuando el pedido se acredita y ya emitió los códigos:
//
//   GET /api/gift-card-mail?order=<id>&key=<order_key>&to=auto|buyer|recipient[&fecha=YYYY-MM-DD]
//
//   to=auto      comprador siempre + destinatario si tiene email y la fecha de
//                envío no es futura (o no tiene).
//   to=recipient sólo destinatarios (lo usa el cron de envío programado; con
//                `fecha` filtra los códigos de ese día).
//
// Autenticado por order_key, igual que /seguimiento. Idempotente por metas en
// el pedido (`_hs_gift_mail_buyer`, `_hs_gift_mail_rcpt_<code>`).

export const dynamic = 'force-dynamic';

const WP_URL        = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY        = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC        = (process.env.WC_CONSUMER_SECRET || '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
// Remitente en el dominio autenticado en Brevo (DKIM brevo1/brevo2). Desde un
// Gmail, Brevo no puede firmar y reescribe el From a @brevosend.com: llega,
// pero fuera de Principal. Las respuestas van al Gmail igual.
const SENDER_EMAIL  = 'pedidos@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

type Code = {
  code: string; monto: number;
  para_email?: string; para_nombre?: string; de_nombre?: string; mensaje?: string; enviar_el?: string;
};

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Colores email-safe por tono: el foil no viaja por mail, un degradado sí.
const TONO: Record<GiftCardTone, { bg: string; ink: string }> = {
  plata:     { bg: 'linear-gradient(135deg,#f2f2f2 0%,#d9d9d9 55%,#c6c6c6 100%)', ink: '#0a0a0a' },
  oro:       { bg: 'linear-gradient(135deg,#f6e7b6 0%,#e6c96a 55%,#c9a227 100%)', ink: '#0a0a0a' },
  esmeralda: { bg: 'linear-gradient(135deg,#8fd0b0 0%,#3d9c76 55%,#14634a 100%)', ink: '#0a0a0a' },
  negro:     { bg: 'linear-gradient(135deg,#3a3a3a 0%,#1a1a1a 55%,#0a0a0a 100%)', ink: '#ffffff' },
};

// Logo blanco oficial en CDN (Logos/README.md): en mails nunca img + filter.
const LOGO_BLANCO = 'https://i.imgur.com/qH2tl73.png';

function numeracion(code: string) {
  const m = code.match(/^HYPE-([A-Z0-9]{4})-([A-Z0-9]{4})$/i);
  return m ? `HYPE-••••-${m[2].toUpperCase()}` : 'HYPE-••••-••••';
}

// Frente de la tarjeta, como en el sitio: STYLE&CULTURE arriba a la derecha,
// el logo al centro, la numeración abajo a la izquierda y el monto a la derecha.
function tarjetaHtml(c: Code) {
  const tone = giftCardTone(c.monto);
  const t = TONO[tone];
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:380px;margin:0 auto;border-collapse:separate;">
    <tr><td style="background:${t.bg};background-color:${tone === 'negro' ? '#1a1a1a' : '#d9d9d9'};border-radius:10px;padding:20px 22px;color:${t.ink};font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr><td style="text-align:right;"><img src="${SITE_URL}/STYLE%26CULTURE%20WHITE.png" alt="Style &amp; Culture" height="9" style="height:9px;width:auto;opacity:.85;"></td></tr>
        <tr><td style="text-align:center;padding:26px 0 30px;"><img src="${LOGO_BLANCO}" alt="Hypestyle" width="150" style="width:150px;height:auto;"></td></tr>
        <tr>
          <td style="font-family:Consolas,'Courier New',monospace;font-size:12px;letter-spacing:.2em;color:rgba(255,255,255,.75);">${numeracion(c.code)}<span style="float:right;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;letter-spacing:0;color:#fff;">${formatGiftAmount(c.monto)}</span></td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="height:14px;"></td></tr>
    <tr><td style="background:#0e0e0e;border-radius:8px;padding:22px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;text-align:center;">
      <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#888;">Código válido en hypestyle.com.ar</div>
      <div style="font-family:Consolas,'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:.18em;margin:18px 0;">${esc(c.code)}</div>
      <div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#888;">Se carga en el checkout, en el campo de código de descuento</div>
    </td></tr>
  </table>`;
}

function layout(titulo: string, intro: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f5;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;">
    <tr><td style="padding:28px 28px 8px;text-align:center;"><img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" height="24" style="height:24px;width:auto;"></td></tr>
    <tr><td style="padding:8px 28px 0;text-align:center;">
      <h1 style="font-size:22px;margin:12px 0 8px;">${titulo}</h1>
      <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">${intro}</p>
    </td></tr>
    <tr><td style="padding:0 28px 28px;">${cuerpo}</td></tr>
    <tr><td style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#777;text-align:center;">
      Vale 12 meses desde hoy en hypestyle.com.ar. El saldo que sobre queda para la próxima compra.<br>
      Las ventas de gift cards son definitivas.<br>
      ¿Dudas? Escribinos por <a href="https://wa.me/5491178292430" style="color:#0a0a0a;">WhatsApp</a>.
    </td></tr>
  </table></body></html>`;
}

async function sendEmail(to: { email: string; name?: string }, subject: string, html: string) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, replyTo: { name: SENDER_NAME, email: REPLY_TO }, to: [to], subject, htmlContent: html }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function setMeta(orderId: number, entries: { key: string; value: string }[]) {
  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ meta_data: entries }),
  }).catch(() => {});
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const orderId = parseInt(sp.get('order') || '', 10);
  const key = sp.get('key') || '';
  const to = (sp.get('to') || 'auto') as 'auto' | 'buyer' | 'recipient';
  const fecha = sp.get('fecha') || '';

  if (!Number.isFinite(orderId) || !key) return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
  if (!BREVO_API_KEY) return NextResponse.json({ error: 'BREVO_API_KEY no configurada' }, { status: 500 });

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
  if (!res.ok) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  const order = await res.json();
  if (order.order_key !== key) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const meta = (k: string) => (order.meta_data || []).find((m: any) => m.key === k)?.value;
  let codes: Code[] = [];
  try { codes = JSON.parse(String(meta('_hs_gift_codes') || '[]')); } catch { codes = []; }
  if (!codes.length) return NextResponse.json({ ok: false, reason: 'sin-codigos' });

  const buyer = { email: String(order.billing?.email || ''), name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() };
  const hoy = new Date().toISOString().slice(0, 10);
  const enviados: string[] = [];
  const nuevasMetas: { key: string; value: string }[] = [];

  // Comprador: un solo mail con todas las tarjetas.
  if ((to === 'auto' || to === 'buyer') && buyer.email && !meta('_hs_gift_mail_buyer')) {
    const cuerpo = codes.map(tarjetaHtml).join('<div style="height:28px;"></div>');
    const intro = codes.length === 1
      ? 'Acá está tu gift card. El código va en el dorso: se carga en el checkout y se descuenta del total.'
      : `Acá están tus ${codes.length} gift cards. Cada código va en el dorso de su tarjeta y se carga en el checkout.`;
    await sendEmail(buyer, `Tu gift card de Hypestyle · pedido #${order.number}`, layout('Gracias por tu compra', intro, cuerpo));
    nuevasMetas.push({ key: '_hs_gift_mail_buyer', value: new Date().toISOString() });
    enviados.push(`buyer:${buyer.email}`);
  }

  // Destinatarios: un mail por tarjeta con email, respetando la fecha.
  if (to === 'auto' || to === 'recipient') {
    for (const c of codes) {
      if (!c.para_email) continue;
      const flag = `_hs_gift_mail_rcpt_${c.code}`;
      if (meta(flag)) continue;
      const programada = c.enviar_el && c.enviar_el > hoy;
      if (to === 'auto' && programada) continue;
      if (to === 'recipient' && fecha && c.enviar_el !== fecha) continue;

      const de = c.de_nombre || buyer.name || 'Alguien';
      const titulo = c.para_nombre ? `${esc(c.para_nombre)}, tenés un regalo` : 'Tenés un regalo';
      const mensaje = c.mensaje ? `<p style="font-size:15px;line-height:1.6;font-style:italic;margin:0 0 20px;">“${esc(c.mensaje)}”</p>` : '';
      const intro = `${esc(de)} te regaló ${formatGiftAmount(c.monto)} para usar en Hypestyle. El código va en el dorso.`;
      await sendEmail({ email: c.para_email, name: c.para_nombre }, `${de} te regaló una gift card de Hypestyle`, layout(titulo, intro, mensaje + tarjetaHtml(c)));
      nuevasMetas.push({ key: flag, value: new Date().toISOString() });
      enviados.push(`rcpt:${c.para_email}`);
    }
  }

  if (nuevasMetas.length) await setMeta(orderId, nuevasMetas);
  return NextResponse.json({ ok: true, enviados });
}
