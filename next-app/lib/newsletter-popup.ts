/**
 * Reglas de disparo del popup de newsletter. Funciones puras: el componente
 * (components/NewsletterPopup.tsx) lee el estado del navegador y decide con esto.
 *
 * El modelo está tomado del popup de Scuffers (script propio de su agencia,
 * leído el 29/09/2026), adaptado a cómo llega el tráfico de Hype:
 *
 * - Solo en fichas de producto. El que entró a un producto ya mostró interés;
 *   el que está en el home todavía no. Antes aparecía a los 7 s en el home.
 * - El tráfico pago (Meta, IG, TikTok) casi todo es mobile y ese click ya se
 *   pagó: a ese visitante no se le tapa la pantalla, se le muestra la barra
 *   de abajo, que deja seguir navegando.
 * - Al resto (orgánico, directo, recurrente) se le muestra el modal cuando
 *   scrolleó la mitad de la ficha o lleva unos segundos en ella.
 * - Cerrar el modal sin suscribirse deja pendiente la barra para la página
 *   siguiente, una sola vez por sesión.
 * - Cerrado → 3 días sin volver a aparecer. Suscripto o comprador → nunca más.
 */

export const FREQUENCY_DAYS = 3;
/** Segundos en la ficha antes de abrir el modal si no llegó al scroll. */
export const MODAL_DELAY_S = 10;
/** Al visitante que ya vino antes se le muestra antes: ya conoce la marca. */
export const MODAL_DELAY_RETURNING_S = 4;
export const MODAL_SCROLL_DEPTH = 0.5;
/** La barra al tráfico pago, en la ficha, después de este tiempo. */
export const BAR_DELAY_SOCIAL_S = 8;
/** La barra que sigue a un modal cerrado, en la página siguiente. */
export const BAR_DELAY_AFTER_CLOSE_S = 2;

export const STORAGE = {
  /** localStorage: `{ expiry }` — cuándo puede volver a aparecer. */
  closed: 'hype_popup_closed',
  /** localStorage: '1' — dejó el email en el popup o llegó desde un mail nuestro. */
  subscribed: 'hype_newsletter_subscribed',
  /** localStorage: '1' — completó una compra (confirmación con pago cursado). */
  buyer: 'hype_comprador',
  /** localStorage: '1' — ya estuvo en el sitio en una visita anterior. */
  visited: 'hype_visited',
  /** sessionStorage: origen de la visita, para que sobreviva a la navegación interna. */
  source: 'hype_traffic_source',
  /** sessionStorage: '1' — cerró el modal, la barra queda para la página siguiente. */
  barPending: 'hype_popup_bar_pending',
  /** sessionStorage: '1' — la barra ya se mostró en esta sesión. */
  barShown: 'hype_popup_bar_shown',
} as const;

export type TrafficSource = 'social' | 'organic' | 'direct';
export type Preferencia = 'hombre' | 'mujer' | 'todo';
export const PREFERENCIAS: { value: Preferencia; label: string }[] = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'todo', label: 'Todo' },
];

const SOCIAL = /facebook|instagram|^fb$|^ig$|tiktok|meta|lnk\.bio|linktr|l\.instagram/i;
const SOCIAL_REF = /facebook\.|instagram\.|tiktok\.|l\.instagram|lm\.facebook|lnk\.bio|linktr\.ee/i;
const ORGANIC_REF = /google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\./i;

/** utm_medium=email o utm_source=brevo/newsletter: viene de un mail nuestro, ya está suscripto. */
export function cameFromOurEmail(search: string): boolean {
  const p = new URLSearchParams(search);
  const medium = (p.get('utm_medium') || '').toLowerCase();
  const source = (p.get('utm_source') || '').toLowerCase();
  return medium === 'email' || /brevo|newsletter|mail/.test(source);
}

/** De dónde llegó la visita. El utm gana; sin utm se mira el referrer. */
export function classifyTraffic(search: string, referrer: string): TrafficSource {
  const p = new URLSearchParams(search);
  const source = (p.get('utm_source') || '').toLowerCase();
  const medium = (p.get('utm_medium') || '').toLowerCase();
  if (source && SOCIAL.test(source)) return 'social';
  if (/paid|cpc|ppc|social/.test(medium)) return 'social';
  if (referrer && SOCIAL_REF.test(referrer)) return 'social';
  if (source && /google|bing/.test(source)) return 'organic';
  if (referrer && ORGANIC_REF.test(referrer)) return 'organic';
  return 'direct';
}

/** Solo fichas de producto: /producto/<slug>, con o sin barra final. */
export function isProductPage(pathname: string): boolean {
  return /^\/producto\/[^/]+\/?$/.test(pathname);
}

/** Páginas donde no va ni el modal ni la barra: están comprando, pagando o administrando. */
export function isExcludedPage(pathname: string): boolean {
  return /^\/(admin|checkout|confirmacion|pendiente-de-pago|pagar|mayoristas|acceso|api)(\/|$)/.test(pathname);
}

/** Lo llama la confirmación de compra: a un cliente no se le pide el email de nuevo. Solo en el browser. */
export function markNewsletterBuyer(): void {
  try { localStorage.setItem(STORAGE.buyer, '1'); } catch {}
}

/** El valor guardado al cerrar: hasta cuándo no volver a mostrar nada. */
export function closedUntil(now = Date.now()): string {
  return JSON.stringify({ expiry: now + FREQUENCY_DAYS * 24 * 60 * 60 * 1000 });
}

/** true mientras dure el bloqueo de los 3 días. Un valor roto no bloquea. */
export function isClosedRecently(raw: string | null, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const { expiry } = JSON.parse(raw) as { expiry?: number };
    return typeof expiry === 'number' && expiry > now;
  } catch {
    return false;
  }
}

export type PopupPlan =
  | { kind: 'none' }
  | { kind: 'modal'; delayS: number; scrollDepth: number }
  | { kind: 'bar'; delayS: number };

export interface PopupContext {
  pathname: string;
  source: TrafficSource;
  subscribed: boolean;
  buyer: boolean;
  closedRecently: boolean;
  returning: boolean;
  barPending: boolean;
  barShown: boolean;
}

/** Qué mostrar en esta página, y cuándo. */
export function planPopup(ctx: PopupContext): PopupPlan {
  if (isExcludedPage(ctx.pathname)) return { kind: 'none' };
  if (ctx.subscribed || ctx.buyer) return { kind: 'none' };

  // Cerró el modal en la página anterior: la barra, una vez, en cualquier página.
  // Va antes del bloqueo de frecuencia porque cerrar el modal es lo que lo activa.
  if (ctx.barPending && !ctx.barShown) return { kind: 'bar', delayS: BAR_DELAY_AFTER_CLOSE_S };

  if (ctx.closedRecently) return { kind: 'none' };
  if (!isProductPage(ctx.pathname)) return { kind: 'none' };

  if (ctx.source === 'social') {
    if (ctx.barShown) return { kind: 'none' };
    return { kind: 'bar', delayS: BAR_DELAY_SOCIAL_S };
  }

  return {
    kind: 'modal',
    delayS: ctx.returning ? MODAL_DELAY_RETURNING_S : MODAL_DELAY_S,
    scrollDepth: MODAL_SCROLL_DEPTH,
  };
}
