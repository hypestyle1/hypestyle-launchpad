// Link y cookie de /pagar. Archivo aparte y sin imports de node porque lo usa
// middleware.ts, que corre en el edge.

/** Cookie httpOnly donde queda la order_key de ese pedido, una por pedido. */
export const repagoCookie = (orderId: number | string) => `hs_pagar_${orderId}`;
export const REPAGO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** Forma de una order_key de Woo. Lo que no matchea ni se guarda. */
export const ORDER_KEY_RE = /^wc_order_[A-Za-z0-9]{6,40}$/;
