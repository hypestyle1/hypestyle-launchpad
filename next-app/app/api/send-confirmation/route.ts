import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER_EMAIL  = 'hypestylearg@gmail.com';
const SENDER_NAME   = 'Hypestyle';
const ADMIN_EMAIL   = 'hypestylearg@gmail.com';

const METODO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia / depósito bancario',
  mercadopago:   'Mercado Pago',
  tarjeta:       'Mercado Pago (tarjeta)',
  paypal:        'PayPal',
};

function formatPrice(n: number) {
  return '$ ' + n.toLocaleString('es-AR');
}

function buildHtml(order: {
  orderNum: string | number;
  wcOrderId?: number;
  orderKey?: string;
  items: { name: string; size: string; quantity: number; price: number; image?: string }[];
  total: number;
  nombre: string;
  apellido: string;
  email: string;
  paymentMethod?: string;
}) {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;color:#111;font-weight:600;">${item.name}</span><br/>
        <span style="font-size:12px;color:#888;">Talle: ${item.size} · Cant: ${item.quantity}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const transferNote = order.paymentMethod === 'transfer' ? `
    <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin:24px 0;font-size:13px;color:#333;">
      <strong>Instrucciones para tu transferencia:</strong><br/><br/>
      Alias: <strong>HYPESTYLE.MP</strong><br/>
      Titular: Hypestyle<br/><br/>
      Una vez realizada, enviá el comprobante por Instagram a <strong>@hypestylearg</strong> con tu número de pedido.
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="140" style="height:auto;display:inline-block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Pedido #${order.orderNum}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">¡Gracias por tu compra!</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${order.nombre}, recibimos tu pedido y ya estamos trabajando en él.
              Te avisamos cuando esté en camino.
            </p>

            ${transferNote}

            <!-- Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              ${rows}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="padding:14px 0;font-size:14px;font-weight:700;color:#111;">Total</td>
                <td style="padding:14px 0;text-align:right;font-size:16px;font-weight:700;color:#111;">${formatPrice(order.total)}</td>
              </tr>
            </table>

            <!-- Shipping note -->
            <p style="margin:24px 0 0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;">
              Envío por Andreani — 5 a 10 días hábiles a partir de la confirmación del pago.
            </p>

            ${order.wcOrderId && order.orderKey ? `
            <!-- Tracking CTA -->
            <div style="margin-top:24px;text-align:center;">
              <a href="${SITE_URL}/seguimiento?pedido=${order.wcOrderId}&clave=${order.orderKey}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:13px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Seguir mi pedido →
              </a>
              <p style="margin:8px 0 0;font-size:11px;color:#aaa;">El estado se actualiza cuando el envío es despachado.</p>
            </div>
            ` : ''}
          </td>
        </tr>

        <!-- Footer -->
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

function buildAdminHtml(order: any) {
  const metodo = METODO_LABEL[order.paymentMethod] || order.paymentMethod || 'No especificado';
  const rows = (order.items || []).map((item: any) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;">${item.name} — Talle ${item.size} x${item.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${formatPrice(item.price * item.quantity)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:16px 24px;">
      <span style="color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Nueva venta — Hypestyle</span>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">Pedido #${order.orderNum}</p>
      <table style="width:100%;margin-bottom:12px;">${rows}</table>
      <p style="font-size:15px;font-weight:700;text-align:right;margin:8px 0 20px;">Total: ${formatPrice(order.total)}</p>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#888;width:120px;">Medio de pago</td><td style="padding:4px 0;font-weight:600;color:${order.paymentMethod === 'transferencia' ? '#15803d' : '#111'};">${metodo}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Cliente</td><td style="padding:4px 0;">${order.nombre} ${order.apellido}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Email</td><td style="padding:4px 0;">${order.email}</td></tr>
        ${order.ciudad ? `<tr><td style="padding:4px 0;color:#888;">Ubicación</td><td style="padding:4px 0;">${order.ciudad}, ${order.provincia}</td></tr>` : ''}
      </table>
    </div>
  </div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const order = await req.json();

    if (!order?.email || !order?.orderNum) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const sendEmail = (to: { email: string; name?: string }, subject: string, html: string) =>
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, to: [to], subject, htmlContent: html }),
      });

    // Email al comprador
    const res = await sendEmail(
      { email: order.email, name: `${order.nombre} ${order.apellido}` },
      `Pedido #${order.orderNum} confirmado — Hypestyle`,
      buildHtml(order),
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('[brevo]', err);
      return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
    }

    // Notificación al admin (fire & forget)
    sendEmail(
      { email: ADMIN_EMAIL, name: 'Hypestyle Admin' },
      `🛍 Nueva venta #${order.orderNum} — ${METODO_LABEL[order.paymentMethod] || order.paymentMethod || 'Sin método'}`,
      buildAdminHtml(order),
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[send-confirmation]', err);
    return NextResponse.json({ error: 'Internal error', detail: String(err?.message || err) }, { status: 500 });
  }
}
