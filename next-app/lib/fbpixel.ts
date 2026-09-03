/**
 * Eventos del pixel de Meta.
 *
 * Espejo de `lib/ga.ts`: mismos puntos de disparo, payload traducido a los
 * nombres estándar de Meta. Existe para que los eventos del pixel dejen de
 * estar escritos a mano en cada componente — así fue como el `AddToCart` quedó
 * solo en ProductCard y nunca llegó a la ficha de producto, y como ViewContent
 * y AddPaymentInfo nunca se escribieron (audit de medición del 11-12/08/2026,
 * ver `12 - Analytics` en el vault).
 *
 * Todos los importes van en ARS, mismo criterio que GA4: los precios del
 * carrito se guardan en pesos y la conversión a USD/EUR es solo de presentación
 * (context/LocaleContext).
 *
 * NOTA SOBRE content_ids — deuda conocida, no se resuelve acá:
 * el `id` que usa el frontend es el SLUG del producto (`id: node.slug` en
 * lib/products-normalize.ts), mientras el catálogo de Meta indexa por el ID
 * numérico de WooCommerce (`retailer_id`). Nunca matchean, y Meta lo reporta
 * como diagnóstico en estado failed (`pixel_has_low_event_source_match_rate`).
 * Este módulo mantiene deliberadamente la convención actual para no mezclar dos
 * cambios: unificar el identificador toca el modelo de datos del frontend y va
 * en su propio PR. Cuando se haga, se cambia acá y aplica a los cuatro eventos.
 */

import { getFbCookies } from '@/lib/fbtracking';

export interface FbItem {
  /** Hoy es el slug. Ver nota sobre content_ids arriba. */
  id: string;
  name?: string;
  price?: number;
  quantity?: number;
}

const CURRENCY = 'ARS';

/**
 * `window.fbq` lo define components/MetaPixel.tsx dentro de un useEffect, y los
 * efectos del layout corren DESPUÉS de los de la página. Un evento disparado al
 * montar —el ViewContent de la ficha de producto es exactamente ese caso— puede
 * llegar antes de que fbq exista. Mismo patrón de reintento que `gaEvent` en
 * lib/ga.ts y que el `firePurchase` de ConfirmacionClient.
 *
 * Si fbq nunca aparece (el visitante eligió "Solo necesarias", que es cuando
 * MetaPixel no carga el script) el evento se descarta, que es lo que
 * corresponde. A propósito no se encola en ningún lado: eso terminaría enviando
 * los eventos de alguien que optó por salir si el pixel cargara más tarde.
 */
function fbTrack(name: string, params: Record<string, unknown>, eventId?: string, attempts = 0): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') {
    window.fbq('track', name, params, eventId ? { eventID: eventId } : undefined);
    return;
  }
  if (attempts < 40) setTimeout(() => fbTrack(name, params, eventId, attempts + 1), 200);
}

/* ─── Conversions API ────────────────────────────────────────────────────
 * Los eventos de mitad de embudo salen por los dos caminos a la vez: el pixel
 * del navegador y `/api/capi` (server-side), con el MISMO event_id para que Meta
 * deduplique. No es redundancia: el audit del 14/08/2026 midió 43 InitiateCheckout
 * del pixel contra 150 pedidos creados en Woo, y como el evento se dispara antes
 * de crear la orden, ese ~70% es entrega perdida en el navegador (bloqueadores,
 * ITP, navegadores in-app). El camino server-side no se puede bloquear.
 *
 * El Purchase queda afuera a propósito: ya viaja server-side desde WooCommerce,
 * donde además el pago está confirmado.
 * ──────────────────────────────────────────────────────────────────────── */

/** Datos de advanced matching que el checkout ya conoce. Se hashean en el server. */
export interface FbUserData {
  em?: string; ph?: string; fn?: string; ln?: string;
  ct?: string; st?: string; zp?: string; country?: string;
}

const CONSENT_KEY = 'hy_cookie_consent';

/**
 * Mismo modelo opt-out que components/MetaPixel.tsx: se trackea por defecto y solo
 * se corta si la persona eligió explícitamente "Solo necesarias". Se lee de
 * localStorage en vez de pasar el contexto por parámetro porque este módulo lo
 * llaman componentes que no están dentro del provider — y porque el gate tiene que
 * valer también para el camino server-side, donde `fbq` ya no sirve de señal: si
 * el pixel no cargó no se sabe si fue por opt-out o por un bloqueador.
 */
function trackingAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) !== 'necessary';
  } catch {
    return true;
  }
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `keepalive` para que el evento sobreviva si la persona navega enseguida —
 * el AddPaymentInfo sale justo antes del salto al gateway de pago.
 * Si el POST falla se descarta en silencio: es medición, nunca puede romper
 * ni demorar el checkout.
 */
function sendCapi(
  eventName: string,
  eventId: string,
  customData: Record<string, unknown>,
  userData?: FbUserData,
): void {
  if (typeof window === 'undefined') return;
  try {
    fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: customData,
        // fbp/fbc van sin hashear: ya son identificadores de Meta. Se reusa el
        // mismo lector que alimenta al Purchase server-side, para que los tres
        // eventos hablen del mismo click.
        user_data: { ...(userData ?? {}), ...getFbCookies() },
      }),
    }).catch(() => {});
  } catch {
    /* medición: nunca propagar */
  }
}

function contentsOf(items: FbItem[]) {
  return items.map(i => ({ id: i.id, quantity: i.quantity ?? 1 }));
}

function totalOf(items: FbItem[]): number {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}

export function fbViewContent(item: FbItem & { category?: string }): void {
  fbTrack('ViewContent', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    content_category: item.category,
    value: item.price ?? 0,
    currency: CURRENCY,
  });
}

export function fbAddToCart(item: FbItem): void {
  const quantity = item.quantity ?? 1;
  fbTrack('AddToCart', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    contents: [{ id: item.id, quantity }],
    value: (item.price ?? 0) * quantity,
    currency: CURRENCY,
  });
}

/**
 * `value` se recibe explícito en vez de sumarse de los items: el total del
 * checkout incluye envío, cupones y descuentos que no viven en el renglón.
 */
export function fbInitiateCheckout(items: FbItem[], value?: number, user?: FbUserData): void {
  if (!trackingAllowed()) return;
  const customData = {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    contents: contentsOf(items),
    num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0),
    value: value ?? totalOf(items),
    currency: CURRENCY,
  };
  const eventId = newEventId();
  fbTrack('InitiateCheckout', customData, eventId);
  sendCapi('InitiateCheckout', eventId, customData, user);
}

export function fbAddPaymentInfo(items: FbItem[], value?: number, user?: FbUserData): void {
  if (!trackingAllowed()) return;
  const customData = {
    content_ids: items.map(i => i.id),
    content_type: 'product',
    contents: contentsOf(items),
    value: value ?? totalOf(items),
    currency: CURRENCY,
  };
  const eventId = newEventId();
  fbTrack('AddPaymentInfo', customData, eventId);
  sendCapi('AddPaymentInfo', eventId, customData, user);
}

/**
 * Alta de un comercio en /mayoristas/solicitud.
 *
 * La campaña de captación mayorista manda tráfico a ese formulario, y sin este
 * evento Meta no tiene con qué optimizar: el ad set sale por LANDING_PAGE_VIEWS,
 * que cuenta al que abre la página y se va igual. Con CompleteRegistration
 * registrado se puede migrar a OFFSITE_CONVERSIONS sin tocar los creativos.
 *
 * `value: 0` a propósito: la solicitud no es una venta, y ponerle el ticket
 * promedio mayorista acá ensuciaría el ROAS de la cuenta con plata que todavía
 * no entró (la solicitud puede no aprobarse, y aprobada puede no comprar nunca).
 */
export function fbCompleteRegistration(user?: FbUserData): void {
  const customData = {
    content_name: 'mayorista',
    status: true,
    value: 0,
    currency: CURRENCY,
  };
  // Mismo par pixel + CAPI que el checkout: el audit del 03/09/2026 encontró 2
  // CompleteRegistration en el pixel contra 5 solicitudes reales en Woo, y
  // ninguna atribuida a la campaña. Con el camino server-side y los datos del
  // comercio (mail, teléfono, ciudad) Meta puede matchear el evento al click.
  const eventId = newEventId();
  fbTrack('CompleteRegistration', customData, eventId);
  sendCapi('CompleteRegistration', eventId, customData, user);
}
