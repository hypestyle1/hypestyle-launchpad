import { NextRequest, NextResponse } from 'next/server';
import { ensureCyberAttributes, ensureWelcomeAttributes } from '@/lib/brevo-attributes';
import { rateLimitCheck, clientIp, RATE_LIMITS } from '@/lib/rate-limit';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const NEWSLETTER_LIST_ID = 3;
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

const PREFERENCIAS = new Set(['hombre', 'mujer', 'todo']);

/**
 * Versión del texto de consentimiento que el usuario vio al dejar el mail. Si
 * el texto de la landing cambia, se sube esta constante: queda registrado en el
 * contacto de Brevo qué se le dijo exactamente cuando aceptó.
 */
const CYBER_CONSENT_VERSION = 'landing-cyber-v2';

/**
 * Lista de Brevo del "Avisame" de CYBER HYPE (hoy la 6, "CYBER HYPE").
 *
 * Variable **solo del servidor**: sin prefijo `NEXT_PUBLIC_`, así que no viaja
 * al navegador ni queda en el bundle. Se lee en cada request —no en el módulo—
 * para poder cambiarla desde Vercel sin rebuild.
 *
 * **Si falta, el alta falla a la vista en vez de caer en otra lista.** Antes
 * había un fallback silencioso a la lista de newsletter: el formulario decía
 * "listo", el contacto quedaba mezclado con la base general y nadie se enteraba
 * hasta el día del envío. Un error visible se arregla en dos minutos; un alta
 * silenciosa en la lista equivocada se descubre tarde.
 */
function cyberListId(): number | null {
  const n = parseInt(String(process.env.BREVO_CYBER_LIST_ID || process.env.BREVO_HYPE72_LIST_ID || '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Trampa para registros automatizados, sin CAPTCHA.
 *
 * Dos señales que a una persona real no le cuestan nada:
 *  - **honeypot**: un campo que el formulario deja vacío y esconde de la vista
 *    y del lector de pantalla. Si viene con algo, lo llenó un script.
 *  - **tiempo**: milisegundos entre que la página se montó y el submit. Un
 *    humano, aun con autocompletado, tarda más de 1,2 s en leer y apretar.
 *
 * Al bot se le responde 200 como si hubiera funcionado: si se le devuelve un
 * error, prueba de nuevo hasta encontrar la forma de pasar.
 */
const MS_MINIMOS_HUMANOS = 1200;

function pareceAutomatizado(body: { empresa?: unknown; ms?: unknown }): boolean {
  if (String(body.empresa ?? '').trim() !== '') return true;
  const ms = Number(body.ms);
  return Number.isFinite(ms) && ms >= 0 && ms < MS_MINIMOS_HUMANOS;
}

/**
 * Origen del alta (UTM). Sirve para saber cuánto cuesta un registro cuando la
 * landing recibe pauta: sin esto, un alta desde un anuncio y una desde una
 * historia son el mismo renglón en Brevo.
 *
 * **Es un dato del usuario, no una credencial.** Viene de la query de la
 * landing, así que cualquiera puede escribir lo que quiera. Por eso:
 *  - se guarda como atributo y NO decide nada —ni la lista, ni el estado de
 *    suscripción, ni el tope de intentos—;
 *  - se recorta a 64 caracteres y se le saca todo lo que no sea texto plano de
 *    UTM, así no entra HTML, comillas ni saltos de línea a un atributo que
 *    después se ve en el panel de Brevo;
 *  - no se le manda a Meta. El `Lead` va sin datos personales y la atribución
 *    de la campaña la hace Meta con su propio click id.
 */
const UTM_CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

function limpiarUtm(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const v = valor.trim().slice(0, 64).replace(/[^\w\s.\-|/+]/g, '');
  return v || null;
}

function atributosUtm(body: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const campo of UTM_CAMPOS) {
    const v = limpiarUtm(body[campo]);
    if (v) out[campo.toUpperCase()] = v;
  }
  return out;
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
 * ¿El contacto ya existe, está dado de baja, y en qué listas está?
 *
 * Brevo NO le entrega nada a un contacto blacklisteado, ni siquiera agregándolo
 * a una lista. Antes esto se usaba para decirle "ese mail está dado de baja" —
 * y esa respuesta distinta era, de hecho, una forma de averiguar desde afuera
 * quién se había dado de baja de los mails de Hype. Ahora el dato se consulta
 * solo para uso interno y la respuesta al usuario es siempre la misma.
 *
 * Las listas importan tanto como la baja: ver `limitarAlEvento`.
 *
 * Ante un error de red o una respuesta rara se asume "no está de baja", que es
 * el lado seguro: el alta sigue, pero sin levantar ninguna baja.
 */
interface EstadoContacto {
  deBaja: boolean;
  listas: number[];
}

async function leerContacto(email: string): Promise<EstadoContacto> {
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' },
    });
    if (!res.ok) return { deBaja: false, listas: [] }; // 404 = no existe → alta nueva
    const c = await res.json().catch(() => null);
    const listas = Array.isArray(c?.listIds)
      ? c.listIds.filter((n: unknown): n is number => typeof n === 'number' && Number.isFinite(n))
      : [];
    return { deBaja: Boolean(c?.emailBlacklisted), listas };
  } catch {
    return { deBaja: false, listas: [] };
  }
}

/**
 * Deja el re-opt-in limitado al evento: saca al contacto de todas las listas
 * menos la del evento, ANTES de levantarle la baja.
 *
 * Por qué hace falta. En Brevo darse de baja no saca de las listas: pone el
 * contacto en una blacklist global y la membresía queda intacta. Verificado
 * contra la cuenta el 28/10: la lista Newsletter (3) tiene 2.914 suscriptores
 * y **99 contactos dados de baja que siguen siendo miembros**. Si el re-opt-in
 * solo quitara la blacklist, el próximo envío general a esa lista volvería a
 * alcanzarlos — exactamente la suscripción que esa persona había cancelado, y
 * que nadie le preguntó si quería de vuelta.
 *
 * Por qué no le quita nada a nadie: un contacto en blacklist no recibe ningún
 * envío, así que su membresía en esas listas hoy vale cero. Sacarlo no le
 * cancela nada que esté recibiendo; solo evita que el alta del evento le
 * devuelva de prepo lo que había dado de baja.
 *
 * Devuelve false si Brevo rechazó el pedido. En ese caso el POST **no levanta
 * la baja**: re-suscribir sin haber podido limitar el alcance es justo lo que
 * este paso existe para impedir.
 */
async function limitarAlEvento(email: string, listas: number[], listaEvento: number): Promise<boolean> {
  const sacar = listas.filter((id) => id !== listaEvento);
  if (sacar.length === 0) return true;
  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlinkListIds: sacar }),
    });
    return res.ok; // Brevo contesta 204 cuando sale bien
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: emailRaw, name, preferencia, origen } = body;
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

    let listId = NEWSLETTER_LIST_ID;
    let reoptin = false;

    if (esCyber) {
      // 1. Bots: se les contesta que sí y no se escribe nada.
      if (pareceAutomatizado(body)) {
        return NextResponse.json({ ok: true, estado: 'alta' });
      }

      // 2. Tope de intentos. Por IP (un script) y por dirección (hostigar un
      //    mail ajeno). En memoria y por instancia, como el resto del sitio:
      //    frena un script, no es un tope global exacto (ver lib/rate-limit).
      const ip = clientIp(req);
      const topes = [
        rateLimitCheck(RATE_LIMITS.registroIp, ip),
        rateLimitCheck(RATE_LIMITS.registroIpDia, ip),
        rateLimitCheck(RATE_LIMITS.registroMail, email),
      ];
      const pasado = topes.find((t) => !t.ok);
      if (pasado) {
        return NextResponse.json(
          { ok: false, error: 'rate_limited', retryAfter: pasado.retryAfterSec },
          { status: 429, headers: { 'Retry-After': String(pasado.retryAfterSec) } },
        );
      }

      // 3. Sin lista configurada no se da de alta en ningún lado: error visible.
      const propia = cyberListId();
      if (!propia) {
        console.error('[cyber] falta BREVO_CYBER_LIST_ID: el alta se rechaza en vez de caer en la lista general');
        return NextResponse.json({ ok: false, error: 'config' }, { status: 503 });
      }
      listId = propia;

      // 4. Si venía dado de baja, el formulario es un consentimiento nuevo —
      //    pero acotado a lo que el texto dice: los mails del evento. Antes de
      //    levantarle la baja se lo saca de las listas generales, así el alta
      //    no le devuelve la newsletter que había cancelado. Si ese paso falla,
      //    la baja se respeta y el alta se rechaza (el formulario ofrece
      //    reintentar): es preferible perder un registro a devolverle los
      //    mails a alguien que se dio de baja.
      const estado = await leerContacto(email);
      if (estado.deBaja) {
        const limitado = await limitarAlEvento(email, estado.listas, propia);
        if (!limitado) {
          console.error('[cyber] no se pudo limitar el re-opt-in a la lista del evento: la baja se respeta y el alta se rechaza');
          return NextResponse.json({ ok: false, error: 'reoptin' }, { status: 503 });
        }
        reoptin = true;
      }
    } else {
      // Alta normal del popup: cada una manda el mail de bienvenida y ese mail
      // consume un crédito de Brevo, el mismo cupo con el que se mandan las
      // campañas del evento. Tope por IP para que un script no lo vacíe.
      const popup = rateLimitCheck(RATE_LIMITS.altaPopupIp, clientIp(req));
      if (!popup.ok) {
        return NextResponse.json(
          { ok: false, error: 'rate_limited', retryAfter: popup.retryAfterSec },
          { status: 429, headers: { 'Retry-After': String(popup.retryAfterSec) } },
        );
      }
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
            ? {
                HYPE72: 'yes',
                HYPE72_DATE: new Date().toISOString(),
                HYPE72_CONSENT: CYBER_CONSENT_VERSION,
                ...(reoptin ? { HYPE72_REOPTIN: 'yes' } : {}),
                ...atributosUtm(body),
              }
            : { SIGNUP_DATE: new Date().toISOString(), WELCOME_STEP: 1 }),
        },
        listIds: [listId],
        updateEnabled: true,
        // Re-opt-in explícito: solo cuando el contacto estaba dado de baja,
        // acaba de pedir el aviso con el texto de consentimiento a la vista, y
        // `limitarAlEvento` ya lo sacó de las listas generales — así lo único
        // que esta línea le devuelve son los mails del evento. En cualquier
        // otro caso no se toca el estado de suscripción.
        ...(reoptin ? { emailBlacklisted: false } : {}),
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

    // Respuesta uniforme para el alta del evento: no dice a qué lista entró, si
    // el contacto ya existía ni si estaba dado de baja. Desde afuera, todas las
    // altas se ven iguales.
    if (esCyber) return NextResponse.json({ ok: true, estado: 'alta' });

    return NextResponse.json({ ok: true, estado: 'alta', listId, bienvenida: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
