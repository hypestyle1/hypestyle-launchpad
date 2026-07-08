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
  gocuotas:      'GOcuotas',
};

async function getUsdRate(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', { cache: 'no-store' });
    if (!res.ok) return 1250;
    const data = await res.json() as { venta?: number };
    return data.venta ?? 1250;
  } catch {
    return 1250;
  }
}

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

// ─── INTERNATIONAL (English / USD / DHL) ────────────────────────────────────

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

  const shippingTotalRow = `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#888;">Shipping (DHL Express)</td>
      <td style="padding:8px 0;text-align:right;font-size:13px;color:#888;font-style:italic;">Quoted separately</td>
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
        Please use your order number as the payment reference. Once payment is received, your order will be approved and DHL shipping will be coordinated by email.
      </p>
    </div>
  ` : '';

  const dhlNote = `
    <div style="background:#f8f8f8;border-left:3px solid #0a0a0a;border-radius:0 6px 6px 0;padding:14px 16px;margin:24px 0;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#111;">DHL Express International Shipping</p>
      <p style="margin:6px 0 0;font-size:12px;color:#666;line-height:1.6;">
        Your shipping cost and estimated delivery time will be confirmed by email within 24 hours.
        Your order will not ship until you approve the DHL quote.
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
                  <span style="font-size:11px;color:#aaa;">Approximate USD equivalent · Shipping quoted separately</span>
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
      🌍 International Order — ${order.pais}
    </div>
  ` : '';

  const intlNote = isIntl ? `
    <tr><td style="padding:4px 0;color:#888;">Shipping</td><td style="padding:4px 0;font-weight:600;color:#b45309;">DHL Express — quote pending</td></tr>
  ` : `
    <tr><td style="padding:4px 0;color:#888;">Envío</td><td style="padding:4px 0;">Andreani</td></tr>
  `;

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#0a0a0a;padding:16px 24px;">
      <span style="color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
        ${isIntl ? '🌍 International Sale' : 'Nueva venta'} — Hypestyle
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

    // PayPal no captura el pago en el momento de crear la orden — recién se
    // confirma cuando el cliente aprueba en PayPal (paypal-capture / paypal-webhook).
    // Hasta entonces no le mandamos al cliente nada que suene a "pago recibido";
    // solo avisamos al admin que hay un intento de pedido en curso.
    const paymentPending = order.paymentPending === true && order.paymentMethod === 'paypal';

    if (!paymentPending) {
      let customerHtml: string;
      let subject: string;

      if (isIntl) {
        const usdRate = await getUsdRate();
        subject      = `Order #${order.orderNum} confirmed — Hypestyle`;
        customerHtml = buildHtmlIntl({ ...order, usdRate });
      } else {
        subject      = `Pedido #${order.orderNum} confirmado — Hypestyle`;
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
    }

    const adminSubject = paymentPending
      ? `⏳ PayPal iniciado #${order.orderNum} — esperando aprobación`
      : isIntl
        ? `🌍 International order #${order.orderNum} — ${order.pais} — ${METODO_LABEL[order.paymentMethod] || order.paymentMethod || '?'}`
        : `🛍 Nueva venta #${order.orderNum} — ${METODO_LABEL[order.paymentMethod] || order.paymentMethod || 'Sin método'}`;

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
