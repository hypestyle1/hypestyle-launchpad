import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY    = (process.env.WC_CONSUMER_KEY    || '').trim();
const WC_SECRET = (process.env.WC_CONSUMER_SECRET || '').trim();
const BREVO_KEY = (process.env.BREVO_API_KEY      || '').replace(/^﻿/, '').trim();
const SITE_URL  = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

const SENDER_EMAIL  = 'info@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

// Datos de transferencia (mismos que muestra /pendiente-de-pago).
const TRANSFER = { cvu: '0000069707170407909550', titular: 'Valentin Pozzi', banco: 'Garpa S.A.' };

// Cupón de recuperación que se muestra en el mail de carrito abandonado (no aplica a transferencia).
const RECOVERY_COUPON   = 'HYPEVUELVE10';
const RECOVERY_DISCOUNT = '10%';

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

async function sendBrevo(to: { email: string; name?: string }, subject: string, html: string, tags?: string[]) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      replyTo: { name: SENDER_NAME, email: REPLY_TO },
      to: [to],
      subject,
      htmlContent: html,
      ...(tags?.length ? { tags } : {}),
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
  subtotal: number;
  shipping: number;
  couponDiscount: number;
  feeLines: { name: string; total: number }[];
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

  // Filas de subtotal / envío / descuentos. Solo aparecen si hay algo que aclarar: en un pedido
  // común sin envío ni bonificación el mail sigue mostrando únicamente el Total, como antes.
  const summaryRow = (label: string, value: string, color = '#666') => `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:${color};">${label}</td>
      <td style="padding:4px 0;text-align:right;font-size:13px;color:${color};">${value}</td>
    </tr>
  `;
  const summaryRows = [
    (order.shipping > 0 || order.couponDiscount > 0 || order.feeLines.length > 0)
      ? summaryRow('Subtotal', formatPrice(order.subtotal))
      : '',
    order.shipping > 0 ? summaryRow('Envío', formatPrice(order.shipping)) : '',
    order.couponDiscount > 0 ? summaryRow('Descuento', `-${formatPrice(order.couponDiscount)}`, '#1a7f4b') : '',
    ...order.feeLines.map(f => summaryRow(
      f.name,
      `${f.total < 0 ? '-' : ''}${formatPrice(Math.abs(f.total))}`,
      f.total < 0 ? '#1a7f4b' : '#666',
    )),
  ].join('');

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
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              ${summaryRows}
              <tr>
                <td style="padding:12px 0 0;font-size:14px;font-weight:700;color:#111;${summaryRows ? 'border-top:1px solid #f0f0f0;' : ''}">Total</td>
                <td style="padding:12px 0 0;text-align:right;font-size:16px;font-weight:700;color:#111;${summaryRows ? 'border-top:1px solid #f0f0f0;' : ''}">${formatPrice(order.total)}</td>
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

function buildCancellationHtml(order: { orderNum: string; nombre: string }) {
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
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111;">Tu pedido fue cancelado</h1>
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
              Hola ${order.nombre}, te informamos que tu pedido #${order.orderNum} fue cancelado.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Cuando quieras retomarlo o tengas alguna consulta, acá estamos para ayudarte.
              Escribinos por Instagram y lo resolvemos juntos.
            </p>
            <div style="text-align:center;">
              <a href="https://instagram.com/hypestylearg"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:13px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                Escribinos por Instagram →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">
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

const ABANDONED_STEP_COPY: Record<number, { eyebrow: string; title: string; intro: (isTransfer: boolean) => string }> = {
  1: {
    eyebrow: 'Pedido sin completar',
    title: 'Te quedó un pedido sin completar',
    intro: (isTransfer) => isTransfer
      ? 'Vimos que iniciaste tu compra pero todavía no nos llegó la transferencia. Tu pedido sigue reservado — completá el pago así lo preparamos.'
      : 'Vimos que iniciaste tu compra pero quedó sin completarse. Tus productos te esperan — terminá tu pedido cuando quieras.',
  },
  2: {
    eyebrow: '¿Seguís interesado?',
    title: 'Tu pedido te sigue esperando',
    intro: (isTransfer) => isTransfer
      ? 'Todavía no nos llegó tu transferencia y tu pedido sigue reservado, pero no por mucho más tiempo. Si ya la hiciste, mandanos el comprobante y lo despachamos.'
      : 'Tu carrito sigue esperando, pero el stock de estos productos es limitado y se puede agotar. Terminá tu compra antes de que se acabe.',
  },
  3: {
    eyebrow: 'Último aviso',
    title: 'Tu pedido y tu descuento vencen pronto',
    intro: (isTransfer) => isTransfer
      ? 'Última oportunidad: si no nos llega la transferencia pronto, vamos a liberar la reserva de tu pedido. Mandanos el comprobante ahora para asegurarlo.'
      : 'Esta es la última vez que te avisamos: tu carrito y tu código de descuento están por vencer. Después de esto no lo volvemos a reservar.',
  },
};

function buildAbandonedHtml(order: {
  orderNum: string;
  nombre: string;
  total: number;
  items: { name: string; size: string; quantity: number; price: number; image?: string }[];
  isTransfer: boolean;
  step: number;
}) {
  const copy = ABANDONED_STEP_COPY[order.step] || ABANDONED_STEP_COPY[1];
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:10px 8px 10px 0;border-bottom:1px solid #f0f0f0;width:56px;">
        ${item.image ? `<img src="${item.image}" alt="" width="48" height="48" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #eee;display:block;" />` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111;">
        ${item.name}${item.size ? ` · Talle ${item.size}` : ''} ×${item.quantity}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>`).join('');

  const transferWaText = encodeURIComponent(`Hola! Te paso el comprobante de la transferencia de mi pedido #${order.orderNum}`);
  const transferBlock = order.isTransfer ? `
    <div style="margin:24px 0 0;background:#f8f8f8;border-radius:8px;padding:16px 18px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111;">Datos para la transferencia</p>
      <p style="margin:0 0 4px;font-size:13px;color:#333;">CVU: <b>${TRANSFER.cvu}</b></p>
      <p style="margin:0 0 4px;font-size:13px;color:#333;">Titular: <b>${TRANSFER.titular}</b> (${TRANSFER.banco})</p>
      <p style="margin:10px 0 0;font-size:13px;color:#333;">Monto: <b>${formatPrice(order.total)}</b></p>
      <p style="margin:10px 0 0;font-size:12px;color:#888;">Cuando la hagas, mandanos el comprobante por WhatsApp y despachamos tu pedido.</p>
      <a href="https://wa.me/5491178292430?text=${transferWaText}" style="display:inline-block;margin-top:10px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:10px 18px;border-radius:6px;">Enviar comprobante por WhatsApp</a>
    </div>` : '';

  // El cupón solo aplica cuando pagan online (no en transferencia: ahí el total ya está fijado).
  const couponUrgency = order.step >= 3 ? 'Vence muy pronto — es tu última chance de usarlo.' : 'Aplicalo en el checkout. Vence pronto.';
  const couponBlock = order.isTransfer ? '' : `
    <div style="margin:24px 0 0;background:#0a0a0a;border-radius:8px;padding:20px;text-align:center;">
      <p style="margin:0 0 10px;font-size:15px;color:#fff;line-height:1.5;">Llevate <b>${RECOVERY_DISCOUNT} OFF</b> con el código</p>
      <p style="margin:0;display:inline-block;background:#fff;color:#0a0a0a;font-size:18px;font-weight:800;letter-spacing:0.06em;padding:8px 18px;border-radius:6px;">${RECOVERY_COUPON}</p>
      <p style="margin:12px 0 0;font-size:12px;color:#999;">${couponUrgency}</p>
    </div>`;

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
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">${copy.eyebrow} · Pedido #${order.orderNum}</p>
            <h1 style="margin:0 0 16px;font-size:23px;font-weight:700;color:#111;">${copy.title}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">Hola ${order.nombre}, ${copy.intro(order.isTransfer)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">${rows}</table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="padding:12px 0;font-size:14px;font-weight:700;color:#111;">Total</td>
                <td style="padding:12px 0;text-align:right;font-size:16px;font-weight:700;color:#111;">${formatPrice(order.total)}</td>
              </tr>
            </table>
            ${transferBlock}
            ${couponBlock}
            <div style="margin-top:24px;text-align:center;">
              <a href="${order.isTransfer ? 'https://instagram.com/hypestylearg' : SITE_URL}"
                 style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:13px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-radius:2px;">
                ${order.isTransfer ? 'Enviar comprobante →' : 'Completar mi compra →'}
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">¿Dudas? <a href="https://instagram.com/hypestylearg" style="color:#111;font-weight:600;">@hypestylearg</a></p>
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

  // Solo con la clave del panel admin (header x-admin-key), igual que el resto de
  // /api/admin. Antes alcanzaba con ?secret=hs2026 — un literal que además viajaba
  // en el bundle del cliente —, así que cualquiera podía pedir el reenvío de la
  // confirmación de CUALQUIER pedido a su propio mail (&to=) y quedarse con los
  // datos completos del cliente: nombre, dirección, items y total.
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderId    = searchParams.get('order_id');
  const action     = searchParams.get('action') || 'both'; // confirmation | tracking | both | cancellation
  const overrideTo = searchParams.get('to') || ''; // optional email override for testing

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
    const paymentMethod = (wcOrder.payment_method as string) || '';

    if (!email) {
      return NextResponse.json({ error: 'Order has no billing email' }, { status: 422 });
    }

    const sendTo = overrideTo || email;

    // Map line items — size is in name ("Producto — Talle M") or meta_data
    const items: { name: string; size: string; quantity: number; price: number; image?: string }[] =
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
        // `subtotal` es el precio ANTES de descuentos — es el importe que el cliente tiene que
        // ver como valor del producto; lo bonificado se aclara abajo en su propia fila.
        const price     = parseFloat(item.subtotal || item.total || '0') / qty;
        const image     = item.image?.src as string | undefined;
        return { name: cleanName, size, quantity: qty, price, image };
      });

    const itemsSubtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shipping       = parseFloat(wcOrder.shipping_total || '0');
    // Descuento de cupón (lo aplica Woo sobre las líneas) vs. líneas de fee negativas
    // (descuentos manuales del panel y del checkout) — son dos mecanismos distintos.
    const couponDiscount = parseFloat(wcOrder.discount_total || '0');
    const feeLines: { name: string; total: number }[] =
      (wcOrder.fee_lines || []).map((f: any) => ({ name: (f.name as string) || 'Ajuste', total: parseFloat(f.total || '0') }));

    const results: Record<string, any> = {
      order_id:     wcOrderId,
      order_number: orderNum,
      email:        sendTo,
      nombre:       `${nombre} ${apellido}`.trim(),
    };

    if (action === 'confirmation' || action === 'both') {
      const html = buildConfirmationHtml({
        orderNum, wcOrderId, orderKey, items, nombre, total,
        subtotal: itemsSubtotal, shipping, couponDiscount, feeLines,
      });
      await sendBrevo(
        { email: sendTo, name: `${nombre} ${apellido}`.trim() },
        `Pedido #${orderNum} confirmado — Hypestyle`,
        html,
        ['order-confirmation'],
      );
      results.confirmation = 'sent';
    }

    if (action === 'tracking' || action === 'both') {
      const html = buildTrackingHtml({ orderNum, wcOrderId, orderKey, nombre });
      await sendBrevo(
        { email: sendTo, name: `${nombre} ${apellido}`.trim() },
        `Tu pedido #${orderNum} está en camino — Hypestyle`,
        html,
        ['order-tracking'],
      );
      results.tracking = 'sent';
    }

    if (action === 'cancellation') {
      const html = buildCancellationHtml({ orderNum, nombre });
      await sendBrevo(
        { email: sendTo, name: `${nombre} ${apellido}`.trim() },
        `Tu pedido #${orderNum} fue cancelado — Hypestyle`,
        html,
        ['order-cancellation'],
      );
      results.cancellation = 'sent';
    }

    if (action === 'abandoned') {
      const step = Math.min(3, Math.max(1, parseInt(searchParams.get('step') || '1', 10) || 1));
      const html = buildAbandonedHtml({ orderNum, nombre, total, items, isTransfer: paymentMethod === 'bacs', step });
      const subject = step === 1 ? 'Te quedó un pedido sin completar — Hypestyle'
        : step === 2 ? 'Tu pedido te sigue esperando — Hypestyle'
        : 'Último aviso: tu pedido y tu descuento vencen pronto — Hypestyle';
      await sendBrevo(
        { email: sendTo, name: `${nombre} ${apellido}`.trim() },
        subject,
        html,
        [`abandoned-step-${step}`],
      );
      results.abandoned = 'sent';
      results.step = step;
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err: any) {
    console.error('[admin/send-order-emails]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
