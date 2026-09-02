import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const WP_SECRET     = process.env.WP_SECRET || '';
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
// Remitente en el dominio autenticado en Brevo (desde un Gmail, Brevo reescribe
// el From a @brevosend.com y el mail sale de Principal).
const SENDER_EMAIL  = 'info@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

function buildShippingHtml(order: {
  orderNum: string;
  wcOrderId: number;
  orderKey: string;
  trackingNumber: string;
  nombre: string;
  items: { name: string; size: string; quantity: number }[];
}) {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111;">
        ${item.name}${item.size ? ` — Talle ${item.size}` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;text-align:right;">
        x${item.quantity}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="140" style="height:auto;display:inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Pedido #${order.orderNum}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">¡Tu pedido está en camino!</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${order.nombre}, tu pedido fue despachado por Andreani y ya está en camino.
            </p>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:20px 24px;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#16a34a;">Código de seguimiento</p>
              <p style="margin:0 0 16px;font-size:26px;font-weight:800;letter-spacing:0.06em;color:#111;">${order.trackingNumber}</p>
              <a href="https://www.andreani.com/envio/${order.trackingNumber}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:11px 24px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Rastrear envío →
              </a>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;margin-bottom:8px;">
              ${rows}
            </table>

            <div style="margin-top:24px;text-align:center;">
              <a href="${SITE_URL}/seguimiento?pedido=${order.wcOrderId}&clave=${order.orderKey}"
                 style="display:inline-block;border:1px solid #e0e0e0;color:#111;text-decoration:none;padding:11px 24px;font-size:12px;font-weight:600;border-radius:2px;">
                Ver estado del pedido
              </a>
            </div>

            <p style="margin:24px 0 0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;text-align:center;">
              Tiempo estimado de entrega: 5 a 10 días hábiles desde el despacho.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">
              ¿Dudas? Escribinos por
              <a href="https://instagram.com/hypestylearg" style="color:#111;font-weight:600;">@hypestylearg</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Verify WP secret
  const auth   = req.headers.get('authorization') || '';
  const secret = req.headers.get('x-hypestyle-secret') || '';
  const token  = auth.replace(/^Bearer\s+/i, '');
  if (!WP_SECRET || (token !== WP_SECRET && secret !== WP_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { wcOrderId, orderKey, trackingNumber, orderNum, nombre, email, items } = await req.json();

    if (!wcOrderId || !trackingNumber || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const html = buildShippingHtml({ orderNum, wcOrderId, orderKey, trackingNumber, nombre, items: items || [] });

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        replyTo:     { name: SENDER_NAME, email: REPLY_TO },
        to:          [{ email, name: nombre }],
        subject:     `Tu pedido #${orderNum} está en camino — Hypestyle`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[notify-shipping] brevo error:', err);
      return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
    }

    console.log(`[notify-shipping] sent to ${email} for order #${orderNum}, tracking ${trackingNumber}`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[notify-shipping]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
