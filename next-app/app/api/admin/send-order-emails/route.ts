import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY    = (process.env.WC_CONSUMER_KEY    || '').trim();
const WC_SECRET = (process.env.WC_CONSUMER_SECRET || '').trim();
const BREVO_KEY = (process.env.BREVO_API_KEY      || '').replace(/^﻿/, '').trim();
const SITE_URL  = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

const ADMIN_SECRET  = 'hs2026';
const SENDER_EMAIL  = 'hypestylearg@gmail.com';
const SENDER_NAME   = 'Hypestyle';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
}

function formatPrice(n: number) {
  return '$ ' + Math.round(n).toLocaleString('es-AR');
}

async function fetchOrder(orderId: string) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WC ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function sendBrevo(to: { email: string; name?: string }, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [to],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

function buildConfirmationHtml(order: {
  orderNum: string;
  wcOrderId: number;
  orderKey: string;
  items: { name: string; size: string; quantity: number; price: number }[];
  total: number;
  nombre: string;
}) {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;color:#111;font-weight:600;">${item.name}</span><br/>
        ${item.size ? `<span style="font-size:12px;color:#888;">Talle: ${item.size} · Cant: ${item.quantity}</span>` : `<span style="font-size:12px;color:#888;">Cant: ${item.quantity}</span>`}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${formatPrice(item.price * item.quantity)}
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
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">¡Gracias por tu compra!</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${order.nombre}, recibimos tu pedido y ya estamos trabajando en él.
              Te avisamos cuando esté en camino.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              ${rows}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="padding:14px 0;font-size:14px;font-weight:700;color:#111;">Total</td>
                <td style="padding:14px 0;text-align:right;font-size:16px;font-weight:700;color:#111;">${formatPrice(order.total)}</td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;">
              Envío por Andreani — 5 a 10 días hábiles a partir de la confirmación del pago.
            </p>
            <div style="margin-top:24px;text-align:center;">
              <a href="${SITE_URL}/seguimiento?pedido=${order.wcOrderId}&clave=${order.orderKey}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:13px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Seguir mi pedido →
              </a>
              <p style="margin:8px 0 0;font-size:11px;color:#aaa;">El estado se actualiza cuando el envío es despachado.</p>
            </div>
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

function buildTrackingHtml(order: {
  orderNum: string;
  wcOrderId: number;
  orderKey: string;
  nombre: string;
}) {
  const trackingUrl = `${SITE_URL}/seguimiento?pedido=${order.wcOrderId}&clave=${order.orderKey}`;
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
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">Tu pedido está en camino</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${order.nombre}, tu pedido fue despachado por Andreani y ya está en camino.
              Podés seguir el estado del envío en tiempo real haciendo clic abajo.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${trackingUrl}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:16px 32px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Rastrear mi envío →
              </a>
            </div>
            <p style="margin:0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;">
              El seguimiento puede tardar algunas horas en activarse desde el despacho. Si el link no muestra datos todavía, volvé a intentarlo más tarde.
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderId = searchParams.get('order_id');
  const action  = searchParams.get('action') || 'both'; // confirmation | tracking | both

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
  }

  try {
    const wcOrder = await fetchOrder(orderId);

    const wcOrderId = wcOrder.id as number;
    const orderKey  = (wcOrder.order_key as string) || '';
    const orderNum  = String(wcOrder.number || wcOrderId);
    const email     = (wcOrder.billing?.email as string) || '';
    const nombre    = (wcOrder.billing?.first_name as string) || '';
    const apellido  = (wcOrder.billing?.last_name  as string) || '';
    const total     = parseFloat(wcOrder.total || '0');

    if (!email) {
      return NextResponse.json({ error: 'Order has no billing email' }, { status: 422 });
    }

    // Map line items — size is in name ("Producto — Talle M") or meta_data
    const items: { name: string; size: string; quantity: number; price: number }[] =
      (wcOrder.line_items || []).map((item: any) => {
        const rawName  = (item.name as string) || 'Producto';
        const sizeMatch = rawName.match(/[—\-–]\s*Talle\s*(\S+)/i);
        let size = sizeMatch ? sizeMatch[1] : '';
        if (!size) {
          const meta = (item.meta_data || []).find((m: any) =>
            ['Talle', 'talle', 'size', 'pa_talle', 'pa_size'].includes(m.key)
          );
          if (meta) size = String(meta.value);
        }
        const cleanName = rawName.replace(/\s*[—\-–]\s*Talle\s*\S+/i, '').trim();
        const qty       = (item.quantity as number) || 1;
        const price     = parseFloat(item.total || '0') / qty;
        return { name: cleanName, size, quantity: qty, price };
      });

    const results: Record<string, any> = {
      order_id:     wcOrderId,
      order_number: orderNum,
      email,
      nombre:       `${nombre} ${apellido}`.trim(),
    };

    if (action === 'confirmation' || action === 'both') {
      const html = buildConfirmationHtml({ orderNum, wcOrderId, orderKey, items, total, nombre });
      await sendBrevo(
        { email, name: `${nombre} ${apellido}`.trim() },
        `Pedido #${orderNum} confirmado — Hypestyle`,
        html,
      );
      results.confirmation = 'sent';
    }

    if (action === 'tracking' || action === 'both') {
      const html = buildTrackingHtml({ orderNum, wcOrderId, orderKey, nombre });
      await sendBrevo(
        { email, name: `${nombre} ${apellido}`.trim() },
        `Tu pedido #${orderNum} está en camino — Hypestyle`,
        html,
      );
      results.tracking = 'sent';
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err: any) {
    console.error('[admin/send-order-emails]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
