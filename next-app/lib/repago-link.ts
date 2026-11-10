// Link y cookie de /pagar. Archivo aparte y sin imports de node porque lo usa
// middleware.ts, que corre en el edge.

/** Cookie httpOnly donde queda la order_key de ese pedido, una por pedido. */
export const repagoCookie = (orderId: number | string) => `hs_pagar_${orderId}`;
export const REPAGO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** Forma de una order_key de Woo. Lo que no matchea ni se guarda. */
export const ORDER_KEY_RE = /^wc_order_[A-Za-z0-9]{6,40}$/;

/**
 * A dónde vuelve GOcuotas cuando la persona sale sin pagar (`url_failure`).
 *
 * Antes era `/checkout/?gocuotas=failed`, sin el pedido: el reintento creaba un
 * pedido nuevo y el viejo quedaba vivo 30–40 min hasta que GOcuotas lo daba por
 * vencido. En el Cyber 2026, 7 de 19 personas que no pudieron terminar en
 * GOcuotas pagaron igual con tarjeta o transferencia, armando todo de nuevo.
 * Ahora vuelven a /pagar con ese mismo pedido, para terminarlo con tarjeta,
 * Mercado Pago o transferencia (con el 10%). La clave pasa a cookie en el
 * middleware y no queda en la URL.
 *
 * Sin una clave válida se mantiene la vuelta vieja al checkout.
 */
/** De qué pasarela vuelve la persona a /pagar, para elegir el aviso de arriba. */
export type VueltaPagar = 'rechazado' | 'pendiente' | 'gocuotas' | null;

export function vueltaPagar(sp: { mp?: string; gocuotas?: string }): VueltaPagar {
  if (sp.mp === 'rechazado' || sp.mp === 'pendiente') return sp.mp;
  if (sp.gocuotas === 'volvio') return 'gocuotas';
  return null;
}

export function urlVueltaGocuotas(siteUrl: string, orderId: number, orderKey: string): string {
  if (!ORDER_KEY_RE.test(orderKey)) return `${siteUrl}/checkout/?gocuotas=failed`;
  return `${siteUrl}/pagar/${orderId}?key=${encodeURIComponent(orderKey)}&gocuotas=volvio`;
}
