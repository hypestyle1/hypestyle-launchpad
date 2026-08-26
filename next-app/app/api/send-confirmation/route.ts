import { NextRequest, NextResponse } from 'next/server';
import { getUsdRate } from '@/lib/fx';
import { CUSTOMS_NOTICE } from '@/lib/shipping-intl';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const WP_SECRET     = process.env.WP_SECRET || '';
const SITE_URL      = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SENDER_EMAIL  = 'hypestylearg@gmail.com';
const SENDER_NAME   = 'Hypestyle';
const ADMIN_EMAIL   = 'hypestylearg@gmail.com';

const METODO_LABEL: Record<string, string> = {
  transferencia: 'Transferencia / depósito bancario',
  mercadopago:   'Mercado Pago',
  tarjeta:       'Mercado Pago (tarjeta)',
  paypal:        'PayPal',
  gocuotas:      'GOcuotas',
};

// La cotización del mail sale de lib/fx, igual que el precio del sitio y el
// cobro de PayPal — tenía su propia copia con respaldo 1250.

function fmtARS(n: number) {
  return '$ ' + n.toLocaleString('es-AR');
}

function fmtUSD(n: number) {
  return '~USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Texto de personalización de dorsal (ej. "#8 CLAUDE"); vacío si no hay.
function dorsalText(c?: { playerName?: string; number?: string }): string {
  if (!c || (!c.playerName && !c.number)) return '';
  return `${c.number ? '#' + c.number : ''}${c.playerName ? ' ' + c.playerName : ''}`.trim();
}

// ─── DOMESTIC (Spanish / ARS / Andreani) ────────────────────────────────────

function buildHtml(order: {
  orderNum: string | number;
  wcOrderId?: number;
  orderKey?: string;
  items: { name: string; size: string; quantity: number; price: number; image?: string; customization?: { playerName?: string; number?: string } }[];
  total: number;
  nombre: string;
  apellido: string;
  email: string;
  paymentMethod?: string;
  talo?: { alias: string | null; cvu: string | null; beneficiario: string | null; cuit: string | null; banco: string | null } | null;
}) {
  const rows = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;color:#111;font-weight:600;">${item.name}</span><br/>
        <span style="font-size:12px;color:#888;">Talle: ${item.size} · Cant: ${item.quantity}</span>
        ${dorsalText(item.customization) ? `<br/><span style="font-size:12px;color:#888;">Dorsal: ${dorsalText(item.customization)}</span>` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${fmtARS(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const waText = encodeURIComponent(`Hola! Te paso el comprobante de la transferencia de mi pedido #${order.orderNum}`);
  // Los datos bancarios son los que genera Talo por orden (alias/CVU únicos) — nunca
  // hardcodear una cuenta fija acá, porque Talo no puede detectar automáticamente una
  // transferencia que no llegue a su alias/CVU generado para esta orden puntual.
  const transferNote = order.paymentMethod === 'transferencia'
    ? (order.talo?.alias ? `
    <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin:24px 0;font-size:13px;color:#333;">
      <strong>Instrucciones para tu transferencia:</strong><br/><br/>
      Banco: <strong>${order.talo.banco === 'CRESIUM' ? 'Cresium S.A.' : (order.talo.banco || '')}</strong><br/>
      ${order.talo.cuit ? `CUIT: <strong>${order.talo.cuit}</strong><br/>` : ''}
      Alias: <strong>${order.talo.alias}</strong><br/>
      Monto exacto: <strong>${fmtARS(order.total)}</strong><br/><br/>
      Tu pedido se confirma solo al detectar la transferencia. Si preferís avisarnos igual, mandanos el comprobante por WhatsApp.<br/>
      <a href="https://wa.me/5491178292430?text=${waText}" style="display:inline-block;margin-top:10px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:10px 18px;border-radius:6px;">Enviar comprobante por WhatsApp</a>
    </div>
  ` : `
    <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin:24px 0;font-size:13px;color:#333;">
      Estamos generando los datos de tu transferencia — entrá a "Seguir mi pedido" abajo en unos minutos para verlos, o escribinos por WhatsApp si no te aparecen.<br/>
      <a href="https://wa.me/5491178292430?text=${waText}" style="display:inline-block;margin-top:10px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:10px 18px;border-radius:6px;">Escribir por WhatsApp</a>
    </div>
  `)
    : '';

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
            ${transferNote}
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              ${rows}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="padding:14px 0;font-size:14px;font-weight:700;color:#111;">Total</td>
                <td style="padding:14px 0;text-align:right;font-size:16px;font-weight:700;color:#111;">${fmtARS(order.total)}</td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#888;background:#f8f8f8;border-radius:6px;padding:12px 16px;">
              Envío por Andreani — 5 a 10 días hábiles a partir de la confirmación del pago.
            </p>
            ${order.wcOrderId && order.orderKey ? `
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

// ─── INTERNATIONAL (English / USD / FedEx) ────────────────────────────────────

function buildHtmlIntl(order: {
  orderNum: string | number;
  wcOrderId?: number;
  orderKey?: string;
  items: { name: string; size: string; quantity: number; price: number; customization?: { playerName?: string; number?: string } }[];
  total: number;
  nombre: string;
  apellido: string;
  email: string;
  paymentMethod?: string;
  usdRate: number;
  /** Costo de envío ya cobrado en la orden, en pesos. */
  shipping?: number;
  shippingLabel?: string;
}) {
  const { usdRate } = order;
  const isTransfer = order.paymentMethod === 'transferencia';

  const rows = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:13px;color:#111;font-weight:600;">${item.name}</span><br/>
        <span style="font-size:12px;color:#888;">Size: ${item.size} · Qty: ${item.quantity}</span>
        ${dorsalText(item.customization) ? `<br/><span style="font-size:12px;color:#888;">Name & number: ${dorsalText(item.customization)}</span>` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#111;white-space:nowrap;">
        ${fmtUSD((item.price * item.quantity) / usdRate)}
      </td>
    </tr>
  `).join('');

  // El envío internacional ya viene cobrado en la orden (tarifario Boxfly), así
  // que se muestra el importe real en vez del viejo "quoted separately".
  const shippingTotalRow = `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">${order.shippingLabel || 'International shipping'}</td>
      <td style="padding:8px 0;text-align:right;font-size:13px;color:#888;">${
        order.shipping ? fmtARS(order.shipping) : 'Included'
      }</td>
    </tr>
  `;

  const transferNote = isTransfer ? `
    <div style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:6px;padding:20px 24px;margin:24px 0;font-size:13px;color:#333;line-height:1.6;">
      <strong style="display:block;margin-bottom:14px;font-size:14px;color:#111;">USD Wire Transfer Details</strong>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
        <tr>
          <td style="padding:6px 0;color:#888;width:45%;">Account holder</td>
          <td style="padding:6px 0;font-weight:600;color:#111;">Valentin Pozzi</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Bank name</td>
          <td style="padding:6px 0;font-weight:600;color:#111;">Lead Bank</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Routing number</td>
          <td style="padding:6px 0;font-weight:700;color:#111;font-family:monospace;letter-spacing:0.05em;">101019644</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Account number</td>
          <td style="padding:6px 0;font-weight:700;color:#111;font-family:monospace;letter-spacing:0.05em;">210731653173</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Account type</td>
          <td style="padding:6px 0;font-weight:600;color:#111;">Checking</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Currency</td>
          <td style="padding:6px 0;font-weight:600;color:#111;">USD</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:6px 0;color:#888;">Reference</td>
          <td style="padding:6px 0;font-weight:600;color:#111;">Order #${order.orderNum}</td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:12px;color:#666;border-top:1px solid #f0f0f0;padding-top:12px;line-height:1.6;">
        Please use your order number as the payment reference. Once payment is received, your order will be approved and shipped with FedEx.
      </p>
    </div>
  ` : '';

  const dhlNote = `
    <div style="background:#f8f8f8;border-left:3px solid #0a0a0a;border-radius:0 6px 6px 0;padding:14px 16px;margin:24px 0;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#111;">International shipping</p>
      <p style="margin:6px 0 0;font-size:12px;color:#666;line-height:1.6;">
        Sent with FedEx, door to door, tracked and insured. We dispatch within 2 to 3 business days of
        payment and email you the tracking number as soon as it ships.<br/><br/>
        ${CUSTOMS_NOTICE}
      </p>
    </div>
  `;

  const paypalNote = order.paymentMethod === 'paypal' ? `
    <p style="margin:12px 0 0;font-size:12px;color:#888;text-align:center;">
      Payment processed via PayPal in USD at the current exchange rate.
    </p>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
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
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Order #${order.orderNum}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">Thank you for your order!</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">
              Hi ${order.nombre}, we've received your order and are preparing it now.
              ${isTransfer
                ? 'Once your bank transfer is confirmed, we\'ll process your order immediately.'
                : 'Your payment has been received.'}
            </p>

            ${dhlNote}
            ${transferNote}

            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;">
              ${rows}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
              ${shippingTotalRow}
              <tr>
                <td style="padding:14px 0 4px;font-size:14px;font-weight:700;color:#111;border-top:1px solid #f0f0f0;">Product Total</td>
                <td style="padding:14px 0 4px;text-align:right;font-size:16px;font-weight:700;color:#111;border-top:1px solid #f0f0f0;">${fmtUSD(order.total / usdRate)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:0 0 8px;">
                  <span style="font-size:11px;color:#aaa;">Approximate USD equivalent · shipping included</span>
                </td>
              </tr>
            </table>

            ${paypalNote}
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">
              Questions? DM us at
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

// ─── Admin notification ──────────────────────────────────────────────────────

function buildAdminHtml(order: any) {
  const isIntl  = order.pais && order.pais !== 'AR';
  const metodo  = METODO_LABEL[order.paymentMethod] || order.paymentMethod || 'No especificado';
  const rows    = (order.items || []).map((item: any) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;">${item.name} — Talle ${item.size} x${item.quantity}${dorsalText(item.customization) ? `<br/><strong style="color:#b45309;">Dorsal: ${dorsalText(item.customization)}</strong>` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${fmtARS(item.price * item.quantity)}</td>
    </tr>`
  ).join('');

  const intlBadge = isIntl ? `
    <div style="display:inline-block;background:#0a0a0a;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 10px;border-radius:4px;margin-bottom:12px;">
      International Order — ${order.pais}
    </div>
  ` : '';

  const intlNote = isIntl ? `
    <tr><td style="padding:4px 0;color:#888;">Shipping</td><td style="padding:4px 0;font-weight:600;color:#b45309;">FedEx International</td></tr>
  ` : `
    <tr><td style="padding:4px 0;color:#888;">Envío</td><td style="padding:4px 0;">Andreani</td></tr>
  `;

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:16px 24px;">
      <span style="color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
        ${isIntl ? 'International Sale' : 'Nueva venta'} — Hypestyle
      </span>
    </div>
    <div style="padding:24px;">
      ${intlBadge}
      <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111;">Pedido #${order.orderNum}</p>
      <table style="width:100%;margin-bottom:12px;">${rows}</table>
      <p style="font-size:15px;font-weight:700;text-align:right;margin:8px 0 20px;">Total: ${fmtARS(order.total)}</p>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#888;width:120px;">Medio de pago</td><td style="padding:4px 0;font-weight:600;color:${order.paymentMethod === 'transferencia' ? '#15803d' : '#111'};">${metodo}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Cliente</td><td style="padding:4px 0;">${order.nombre} ${order.apellido}</td></tr>
        <tr><td style="padding:4px 0;color:#888;">Email</td><td style="padding:4px 0;">${order.email}</td></tr>
        ${order.ciudad ? `<tr><td style="padding:4px 0;color:#888;">Ubicación</td><td style="padding:4px 0;">${order.ciudad}${order.provincia ? `, ${order.provincia}` : ''}${isIntl ? ` — ${order.pais}` : ''}</td></tr>` : ''}
        ${intlNote}
      </table>
    </div>
  </div>
</body></html>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Sólo lo invoca nuestro propio server (order-fulfill y los create-order-*).
  // Sin este check era un relay abierto: cualquiera mandaba mails con la marca
  // Hypestyle a cualquier dirección. Mismo patrón que wp-mail.
  const auth   = req.headers.get('authorization') || '';
  const secret = req.headers.get('x-hypestyle-secret') || '';
  const token  = auth.replace(/^Bearer\s+/i, '');
  if (!WP_SECRET || (token !== WP_SECRET && secret !== WP_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const order = await req.json();

    if (!order?.email || !order?.orderNum) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const isIntl = order.pais && order.pais !== 'AR';

    const sendEmail = (to: { email: string; name?: string }, subject: string, html: string) =>
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, to: [to], subject, htmlContent: html }),
      });

    // Ninguno de estos confirma el pago en el momento de crear la orden — PayPal
    // recién cuando el cliente aprueba (paypal-capture/paypal-webhook), GOcuotas
    // cuando aprueba el crédito (gocuotas-webhook), Mercado Pago/tarjeta cuando
    // vuelve de pagar o llega el webhook (confirm-payment + confirm-paid). Hasta
    // que eso pase no se manda ningún mail — ni al cliente ni al admin — porque
    // el pedido todavía no está confirmado. fulfillOrder() manda este mismo
    // endpoint de nuevo (sin paymentPending) apenas se aprueba, y ahí sí salen los dos.
    const paymentPending = order.paymentPending === true
      && ['paypal', 'gocuotas', 'mercadopago', 'tarjeta'].includes(order.paymentMethod);

    if (paymentPending) {
      return NextResponse.json({ ok: true, skipped: 'payment-pending' });
    }

    // La transferencia es el único método que llega hasta acá con la plata sin
    // acreditar: los otros quedaron frenados arriba por paymentPending. El mail
    // se manda igual porque es el que lleva los datos para pagar, pero decir
    // "confirmado" cuando todavía no entró nada contradice el pedido y le da al
    // admin una venta que no existe. El asunto dice lo que realmente pasó.
    const awaitingPayment = order.paymentMethod === 'transferencia';

    let customerHtml: string;
    let subject: string;

    if (isIntl) {
      const usdRate = await getUsdRate();
      subject      = awaitingPayment
        ? `Order #${order.orderNum} received — complete your payment`
        : `Order #${order.orderNum} confirmed — Hypestyle`;
      customerHtml = buildHtmlIntl({ ...order, usdRate });
    } else {
      subject      = awaitingPayment
        ? `Pedido #${order.orderNum} registrado — falta tu transferencia`
        : `Pedido #${order.orderNum} confirmado — Hypestyle`;
      customerHtml = buildHtml(order);
    }

    const res = await sendEmail(
      { email: order.email, name: `${order.nombre} ${order.apellido}` },
      subject,
      customerHtml,
    );

    if (!res.ok) {
      const err = await res.json();
      console.error('[brevo]', err);
      return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
    }

    const metodoAdmin = METODO_LABEL[order.paymentMethod] || order.paymentMethod || 'Sin método';
    const adminSubject = isIntl
      ? (awaitingPayment
          ? `Pedido internacional #${order.orderNum} — ${order.pais} — esperando transferencia`
          : `Venta internacional #${order.orderNum} — ${order.pais} — ${metodoAdmin}`)
      : (awaitingPayment
          ? `Pedido #${order.orderNum} — esperando transferencia`
          : `Nueva venta #${order.orderNum} — ${metodoAdmin}`);

    sendEmail(
      { email: ADMIN_EMAIL, name: 'Hypestyle Admin' },
      adminSubject,
      buildAdminHtml(order),
    ).catch(() => {});

    // El mail al proveedor de estampas NO se manda acá (el checkout corre antes
    // del pago). Se dispara cuando la orden pasa a PROCESSING (paga) vía el hook
    // de WordPress → /api/internal/supplier-estampa.

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[send-confirmation]', err);
    return NextResponse.json({ error: 'Internal error', detail: String(err?.message || err) }, { status: 500 });
  }
}
