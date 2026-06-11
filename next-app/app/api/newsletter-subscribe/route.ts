import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const NEWSLETTER_LIST_ID = 3;
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

function buildWelcomeHtml(name: string) {
  const hola = name ? `Hola ${name}! ` : '';
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
            <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="130" style="height:auto;display:inline-block;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;background:#fff;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">¡Ya sos parte de Hypestyle!</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              ${hola}Te regalamos un <strong>10% off</strong> en tu próxima compra. Usá el código al finalizar tu pedido — aplica sobre cualquier medio de pago.
            </p>
          </td>
        </tr>

        <!-- Cupón -->
        <tr>
          <td style="padding:0 40px 28px;background:#fff;">
            <div style="background:#f8f8f8;border:1px dashed #ccc;border-radius:6px;padding:20px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Tu código de descuento</p>
              <p style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111;letter-spacing:0.06em;">HYPE10</p>
              <p style="margin:0;font-size:12px;color:#888;">10% off · Válido para tu primera compra</p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 32px;background:#fff;">
            <a href="${SITE_URL}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
              Ver la tienda
            </a>
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

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const firstName = name ? String(name).trim() : '';

    // Add to Brevo contacts list (con el nombre como FIRSTNAME para personalizar campañas)
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...(firstName ? { attributes: { FIRSTNAME: firstName } } : {}), listIds: [NEWSLETTER_LIST_ID], updateEnabled: true }),
    });

    if (!contactRes.ok) {
      const err = await contactRes.json().catch(() => ({}));
      if (err?.code !== 'duplicate_parameter') {
        return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
      }
    }

    // Send welcome email with coupon
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'Hypestyle', email: 'info@hypestyle.com.ar' },
        replyTo:     { name: 'Hypestyle', email: 'hypestylearg@gmail.com' },
        to:          [{ email }],
        subject:     '¡Tu 10% off te espera — Hypestyle!',
        htmlContent: buildWelcomeHtml(firstName),
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
