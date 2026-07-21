import { NextRequest, NextResponse } from 'next/server';
import { ensureWelcomeAttributes } from '@/lib/brevo-attributes';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SITE_URL       = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';
const SECRET         = process.env.CRON_SECRET || 'hs2026';
// CRON_SECRET en Vercel está marcado "Sensitive" (no se puede leer de vuelta ni por
// API/CLI) — el cron real de Vercel sigue autenticando con eso vía Bearer, pero para
// pruebas manuales con &secret= aceptamos también el mismo secret hardcodeado que
// usa el resto del panel admin (send-order-emails, etc.).
const MANUAL_TEST_SECRET = 'hs2026';
const NEWSLETTER_LIST_ID = 3;

// Step 1 (bienvenida + HYPE10) se manda al toque en newsletter-subscribe, con
// WELCOME_STEP=1 seteado ahí mismo. Esta sweep solo se ocupa del 2 y el 3.
// Horas de antigüedad (desde SIGNUP_DATE) requeridas para cada paso.
const WELCOME_STEP_HOURS = [0, 48, 120]; // [step1 (n/a), step2 (~2 días), step3 (~5 días)]

function lastStepOf(attrs: Record<string, any>): number {
  const v = parseInt(String(attrs?.WELCOME_STEP ?? ''), 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function dueStepOf(signupDate: string, attrs: Record<string, any>): number | null {
  const last = lastStepOf(attrs);
  if (last >= 3) return null;
  const next = last + 1;
  const ageHours = (Date.now() - new Date(signupDate).getTime()) / 3600_000;
  return ageHours >= WELCOME_STEP_HOURS[next - 1] ? next : null;
}

async function fetchAllContacts(): Promise<any[]> {
  const limit = 500;
  let offset = 0;
  const all: any[] = [];
  for (;;) {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${NEWSLETTER_LIST_ID}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { 'api-key': BREVO_API_KEY }, cache: 'no-store' }
    );
    if (!res.ok) break;
    const data = await res.json();
    const page = data.contacts || [];
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

async function sendBrevo(to: { email: string; name?: string }, subject: string, html: string, tags?: string[]) {
  // Brevo rechaza el envío si "name" viene como string vacío (contactos sin
  // FIRSTNAME cargado) — hay que omitir la clave del todo, no mandarla en "".
  const recipient = to.name?.trim() ? { email: to.email, name: to.name } : { email: to.email };
  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:  { name: 'Hypestyle', email: 'info@hypestyle.com.ar' },
      replyTo: { name: 'Hypestyle', email: 'hypestylearg@gmail.com' },
      to:      [recipient],
      subject,
      htmlContent: html,
      ...(tags?.length ? { tags } : {}),
    }),
  });
}

async function updateWelcomeStep(email: string, step: number) {
  return fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ attributes: { WELCOME_STEP: step } }),
  });
}

function emailShell(inner: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
            <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="130" style="height:auto;display:inline-block;" />
          </td>
        </tr>
        ${inner}
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

function buildWelcomeStep2Html(name: string) {
  const hola = name ? `${name}, ` : '';
  return emailShell(`
    <tr>
      <td style="padding:32px 40px 24px;background:#fff;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">Lo más pedido de Hypestyle</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
          ${hola}por si todavía no diste una vuelta por la tienda: te dejamos lo que más se está llevando la gente.
          Tu <strong>10% off</strong> con el código <strong>HYPE10</strong> sigue activo para tu primera compra.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;background:#fff;">
        <a href="${SITE_URL}/best-sellers" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
          Ver los más vendidos
        </a>
      </td>
    </tr>
  `);
}

function buildWelcomeStep3Html(name: string) {
  const hola = name ? `${name}, ` : '';
  return emailShell(`
    <tr>
      <td style="padding:32px 40px 24px;background:#fff;">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111;">Tu 10% off vence pronto</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
          ${hola}este es el último recordatorio: todavía tenés tu código de bienvenida sin usar.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px;background:#fff;">
        <div style="background:#f8f8f8;border:1px dashed #ccc;border-radius:6px;padding:20px 24px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Tu código de descuento</p>
          <p style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111;letter-spacing:0.06em;">HYPE10</p>
          <p style="margin:0;font-size:12px;color:#888;">10% off · Válido para tu primera compra</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;background:#fff;">
        <a href="${SITE_URL}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
          Ver la tienda
        </a>
      </td>
    </tr>
  `);
}

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (provided !== SECRET && provided !== MANUAL_TEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const overrideTo = req.nextUrl.searchParams.get('to') || ''; // solo para pruebas manuales
  const forceEmail = req.nextUrl.searchParams.get('force_email') || ''; // procesar un solo contacto puntual
  // Con force_email + force_step se ignora el gate de antigüedad, solo para poder
  // ver el diseño de un paso puntual sin esperar 2/5 días reales (no toca WELCOME_STEP
  // si sendTo viene de &to=, para no romper la secuencia real del contacto).
  const forceStep = parseInt(req.nextUrl.searchParams.get('force_step') || '', 10);

  // El interruptor de producción solo bloquea la sweep real (todos los contactos);
  // un test puntual con force_email pasa igual para poder validar el copy sin
  // prender el cron para toda la lista.
  if (!forceEmail && process.env.WELCOME_SEQUENCE_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, disabled: true, message: 'Secuencia de bienvenida en pausa (setear WELCOME_SEQUENCE_ENABLED=true para activar).' });
  }

  await ensureWelcomeAttributes(BREVO_API_KEY);

  const contacts = await fetchAllContacts();
  const sent: any[] = [];

  if (forceEmail && req.nextUrl.searchParams.get('debug') === '1') {
    const match = contacts.find(c => c.email?.toLowerCase() === forceEmail.toLowerCase());
    return NextResponse.json({
      ok: true,
      contactos: contacts.length,
      found: !!match,
      contact: match ? { email: match.email, emailBlacklisted: match.emailBlacklisted, attributes: match.attributes } : null,
    });
  }

  for (const c of contacts) {
    if (forceEmail && c.email?.toLowerCase() !== forceEmail.toLowerCase()) continue;
    if (c.emailBlacklisted) continue;

    const attrs = c.attributes || {};
    const signupDate = attrs.SIGNUP_DATE;
    if (!signupDate) continue; // contacto viejo, de antes de la secuencia — no lo tocamos

    const step = (forceEmail && [2, 3].includes(forceStep)) ? forceStep : dueStepOf(signupDate, attrs);
    if (step === null) continue;

    const name = String(attrs.FIRSTNAME || '').trim();
    const html = step === 2 ? buildWelcomeStep2Html(name) : buildWelcomeStep3Html(name);
    const subject = step === 2 ? 'Mirá lo más pedido — Hypestyle' : 'Tu 10% off vence pronto — Hypestyle';
    const sendTo = overrideTo || c.email;

    try {
      const res = await sendBrevo({ email: sendTo, name }, subject, html, [`welcome-step-${step}`]);
      if (res.ok) {
        if (!overrideTo) await updateWelcomeStep(c.email, step);
        sent.push({ email: c.email, step, to: sendTo });
      } else if (forceEmail) {
        const err = await res.json().catch(() => ({}));
        sent.push({ email: c.email, step, to: sendTo, error: err });
      }
    } catch (e: any) {
      if (forceEmail) sent.push({ email: c.email, step, to: sendTo, error: String(e?.message || e) });
    }
  }

  return NextResponse.json({ ok: true, contactos: contacts.length, enviados: sent.length, detalle: sent });
}
