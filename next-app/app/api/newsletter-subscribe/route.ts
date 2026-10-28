import { NextRequest, NextResponse } from 'next/server';
import { ensureCyberAttributes, ensureWelcomeAttributes } from '@/lib/brevo-attributes';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const NEWSLETTER_LIST_ID = 3;
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

const PREFERENCIAS = new Set(['hombre', 'mujer', 'todo']);

/**
 * Versión del texto de consentimiento que el usuario vio al dejar el mail. Si
 * el texto de la landing cambia, se sube esta constante: queda registrado en el
 * contacto de Brevo qué se le dijo exactamente cuando aceptó.
 */
const CYBER_CONSENT_VERSION = 'landing-cyber-v1';

/**
 * Lista de Brevo del "Avisame" de CYBER HYPE. Se lee en cada request (no en el
 * módulo) para que no quede congelada en el build y para poder cambiarla desde
 * Vercel sin tocar código.
 *
 * Si no está cargada, el alta NO se pierde: cae en la lista de newsletter, pero
 * igual sin SIGNUP_DATE y sin bienvenida, así que tampoco recibe el cupón (ver
 * el bloque de abajo). Lo único que se pierde es poder segmentar el envío.
 */
function cyberListId(): number | null {
  const n = parseInt(String(process.env.BREVO_CYBER_LIST_ID || process.env.BREVO_HYPE72_LIST_ID || '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Validación de email. `includes('@')` dejaba pasar "a@" y "hola@gmail" — y cada
 * dirección inválida es un bounce que castiga la reputación del dominio (el
 * envío del 14/10 tuvo 65 soft + 2 hard bounces sobre 2.853).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function normalizarEmail(raw: unknown): string | null {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

// El popup ya no pide nombre (solo email): el saludo va sin nombre. El nombre
// real llega con la primera compra (send-confirmation lo carga en NOMBRE).
function buildWelcomeHtml(name = '') {
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
          <td style="padding:0 40px 32px;background:#fff;text-align:center;">
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

/**
 * ¿El contacto ya existe y está dado de baja?
 *
 * Importa para no mentirle: Brevo NO vuelve a suscribir a un contacto
 * blacklisteado cuando se lo agrega a una lista (y está bien que no lo haga —
 * la baja es suya). Sin este chequeo el formulario diría "listo, te avisamos" y
 * el aviso nunca le iba a llegar.
 *
 * Contrapartida conocida: la respuesta distingue "dado de baja" de "alta", así
 * que alguien que pruebe direcciones podría deducir que una dirección se dio de
 * baja de los mails de Hype. Se eligió la honestidad del formulario por sobre
 * eso; el dato que se filtra es de baja sensibilidad y no se distingue entre
 * "alta nueva" y "ya estaba" (eso sí sería enumerar la lista).
 */
async function estaDadoDeBaja(email: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' },
    });
    if (!res.ok) return false; // 404 = no existe → es un alta nueva
    const c = await res.json().catch(() => null);
    return Boolean(c?.emailBlacklisted);
  } catch {
    return false; // ante la duda, el alta sigue: perder un contacto es peor
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email: emailRaw, name, preferencia, origen } = await req.json();
    const email = normalizarEmail(emailRaw);
    if (!email) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    // `name` queda por compatibilidad con formularios viejos; el popup ya no lo manda.
    const firstName = name ? String(name).trim() : '';
    const pref = PREFERENCIAS.has(String(preferencia)) ? String(preferencia) : '';
    // El "Avisame" de CYBER HYPE captura el mail igual, pero NO entra a la
    // secuencia de bienvenida: ese mail regala HYPE10 (10% off) y durante el
    // evento ese 10% se suma a los packs y al 10% de transferencia (ver
    // _claude/auditorias/2026-10-25-cupones-vs-packs.md). Cualquier otro valor
    // de `origen` —y que no venga— es el alta normal del sitio, que sigue igual.
    // Se aceptan los dos nombres: 'cyber' es el público, 'hype72' el interno con
    // el que quedó escrito el PR original.
    const origenNorm = String(origen ?? '').trim().toLowerCase();
    const esCyber = origenNorm === 'cyber' || origenNorm === 'hype72';
    const listId = esCyber ? (cyberListId() ?? NEWSLETTER_LIST_ID) : NEWSLETTER_LIST_ID;

    // Un contacto dado de baja no recibe nada, ni siquiera agregándolo a la
    // lista: se lo dice el formulario en vez de prometerle un aviso.
    if (esCyber && (await estaDadoDeBaja(email))) {
      return NextResponse.json({ ok: true, estado: 'dado-de-baja', listId, bienvenida: false });
    }

    await (esCyber ? ensureCyberAttributes(BREVO_API_KEY) : ensureWelcomeAttributes(BREVO_API_KEY));

    // Alta en la lista. NOMBRE es el atributo de nombre de la cuenta (FIRSTNAME no
    // existe: Brevo lo descartaba en silencio y la lista quedó sin nombres).
    // PREFERENCIA (hombre/mujer/todo) es lo que eligió en el popup, para mandar
    // los drops de mujer solo a quien los pidió. SIGNUP_DATE/WELCOME_STEP son
    // para que welcome-sweep sepa cuándo mandar los siguientes pasos.
    //
    // CYBER HYPE va con HYPE72='yes' + HYPE72_DATE (cuándo dio el consentimiento)
    // + HYPE72_CONSENT (qué texto aceptó) y SIN SIGNUP_DATE/WELCOME_STEP, a
    // propósito: welcome-sweep (app/api/admin/welcome-sweep) recorre SOLO la
    // lista de newsletter y dentro de ella saltea a todo contacto sin
    // SIGNUP_DATE. Con eso el alta del evento queda excluida del cupón por dos
    // lados independientes, sin tocar el cron que ya corre en producción.
    //
    // Si el mail ya existía como suscriptor de la newsletter, updateEnabled lo
    // suma a la lista del evento y le pone la etiqueta sin pisarle SIGNUP_DATE ni
    // WELCOME_STEP: su secuencia sigue como estaba (y encima deja de recibir la
    // bienvenida por segunda vez, que es lo que pasaba antes). Ese mismo
    // updateEnabled es el que hace idempotente el alta repetida: el que manda su
    // mail dos veces no se duplica ni recibe nada dos veces.
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        attributes: {
          ...(firstName ? { NOMBRE: firstName } : {}),
          ...(pref ? { PREFERENCIA: pref } : {}),
          ...(esCyber
            ? { HYPE72: 'yes', HYPE72_DATE: new Date().toISOString(), HYPE72_CONSENT: CYBER_CONSENT_VERSION }
            : { SIGNUP_DATE: new Date().toISOString(), WELCOME_STEP: 1 }),
        },
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!contactRes.ok) {
      const err = await contactRes.json().catch(() => ({}));
      if (err?.code !== 'duplicate_parameter') {
        return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
      }
    }

    // Send welcome email with coupon — solo el alta normal del sitio.
    if (!esCyber) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender:      { name: 'Hypestyle', email: 'info@hypestyle.com.ar' },
          replyTo:     { name: 'Hypestyle', email: 'hypestylearg@gmail.com' },
          to:          [{ email }],
          subject:     '¡Tu 10% off te espera — Hypestyle!',
          htmlContent: buildWelcomeHtml(firstName),
          tags:        ['welcome-step-1'],
        }),
      });
    }

    return NextResponse.json({ ok: true, estado: 'alta', listId, bienvenida: !esCyber });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
