import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Conversions API — eventos de mitad de embudo (InitiateCheckout, AddPaymentInfo).
 *
 * Por qué existe: el `Purchase` ya viaja server-side desde WooCommerce
 * (`PHP/hypestyle-api.php`, `hype_capi_purchase`), pero el resto del embudo salía
 * SOLO por el navegador. El audit del 14/08/2026 midió el agujero: Woo creó 150
 * pedidos en 30 días y el pixel registró 43 InitiateCheckout. Como el evento se
 * dispara antes de crear la orden, todo pedido pagado tuvo que pasar por ahí: ese
 * ~70% no es un problema de dónde se dispara, es entrega perdida — bloqueadores de
 * anuncios, ITP de Safari y navegadores in-app se comen el `fbevents.js`. La única
 * forma de recuperarlo es mandar el mismo evento desde el servidor.
 *
 * Dedup: el navegador y este relay mandan el MISMO `event_id` (lo genera
 * lib/fbpixel.ts). Meta descarta el duplicado y se queda con el que llegó primero,
 * así que un evento que llega por los dos caminos cuenta una vez, y uno que el
 * browser pierde igual llega. Mismo criterio que el Purchase, que deduplica por
 * order_id.
 *
 * Consentimiento: el cliente no llama a esta ruta si el visitante eligió "Solo
 * necesarias" (ver lib/fbpixel.ts). El gate vive del lado del browser porque es el
 * único que conoce la decisión; acá no hay forma de reconstruirla.
 *
 * Fail-closed con el token: si falta `META_CAPI_TOKEN` la ruta no manda nada y
 * responde 204. Nada de hardcodear el token como fallback — ver el audit de
 * secretos del 11/08/2026.
 */

export const runtime = 'nodejs';

const GRAPH_VERSION = 'v21.0';
const PIXEL_ID  = (process.env.NEXT_PUBLIC_META_PIXEL_ID || '412944573148639').trim();
const CAPI_TOKEN = (process.env.META_CAPI_TOKEN || '').trim();
/** Opcional: aparece en Events Manager → Test Events mientras se valida el fix. */
const TEST_EVENT_CODE = (process.env.META_CAPI_TEST_EVENT_CODE || '').trim();

/**
 * Allowlist. La ruta es pública (la llama el navegador), así que sin esto
 * cualquiera podría inyectar `Purchase` a nombre del pixel. Purchase queda
 * deliberadamente afuera: ese sale de WooCommerce, donde el pago está confirmado.
 */
const ALLOWED_EVENTS = new Set(['InitiateCheckout', 'AddPaymentInfo', 'CompleteRegistration']);

interface UserDataIn {
  em?: string; ph?: string; fn?: string; ln?: string;
  ct?: string; st?: string; zp?: string; country?: string;
  fbp?: string; fbc?: string;
}

/** Mismo normalizado que el `$sha` del PHP: trim + lowercase + sha256. */
function sha(value?: string): string | undefined {
  const v = (value ?? '').trim().toLowerCase();
  if (!v) return undefined;
  return createHash('sha256').update(v).digest('hex');
}

/**
 * Teléfono: solo dígitos y prefijo 54 si falta, idéntico a `hype_capi_purchase`.
 * Si los dos lados normalizaran distinto, el mismo comprador contaría como dos
 * personas y el match rate del pixel bajaría en vez de subir.
 */
function shaPhone(raw?: string): string | undefined {
  let digits = (raw ?? '').replace(/\D+/g, '');
  if (!digits) return undefined;
  if (digits.slice(0, 2) !== '54') digits = '54' + digits.replace(/^0+/, '');
  return createHash('sha256').update(digits).digest('hex');
}

/**
 * La IP y el user agent se leen de la request, no del body: son los dos datos que
 * el cliente no debería poder elegir, y son justamente los que sostienen el match
 * cuando no hay email todavía (el InitiateCheckout se dispara al entrar al
 * checkout, antes de que la persona escriba nada).
 */
function clientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || undefined;
}

export async function POST(req: NextRequest) {
  if (!CAPI_TOKEN) {
    // Sin token no hay nada que hacer, pero tampoco es un error del cliente:
    // el navegador ya mandó su copia del evento por el pixel.
    console.warn('[capi] META_CAPI_TOKEN ausente — evento descartado');
    return new NextResponse(null, { status: 204 });
  }

  let body: {
    event_name?: string;
    event_id?: string;
    event_source_url?: string;
    custom_data?: Record<string, unknown>;
    user_data?: UserDataIn;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'body inválido' }, { status: 400 });
  }

  const eventName = String(body.event_name || '');
  if (!ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: false, error: 'evento no permitido' }, { status: 400 });
  }
  if (!body.event_id) {
    // Sin event_id no se puede deduplicar contra el pixel del browser: el evento
    // se contaría dos veces, que es peor que no mandarlo.
    return NextResponse.json({ ok: false, error: 'falta event_id' }, { status: 400 });
  }

  const u = body.user_data ?? {};
  const userData: Record<string, string> = {};
  const put = (k: string, v?: string) => { if (v) userData[k] = v; };
  put('em', sha(u.em));
  put('ph', shaPhone(u.ph));
  put('fn', sha(u.fn));
  put('ln', sha(u.ln));
  put('ct', sha(u.ct));
  put('st', sha(u.st));
  put('zp', sha(u.zp));
  put('country', sha(u.country));
  // fbp/fbc van SIN hashear — Meta los espera en claro, ya son identificadores suyos.
  put('fbp', u.fbp);
  put('fbc', u.fbc);
  put('client_ip_address', clientIp(req));
  put('client_user_agent', req.headers.get('user-agent') || undefined);

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(body.event_id),
      event_source_url: body.event_source_url,
      action_source: 'website',
      user_data: userData,
      custom_data: body.custom_data ?? {},
    }],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[capi] ${eventName} FAIL http ${res.status} ${text.slice(0, 400)}`);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[capi] ${eventName} error de red:`, err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
