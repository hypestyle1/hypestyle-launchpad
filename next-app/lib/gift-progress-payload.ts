/**
 * Qué se le manda al plugin Purchase Gift para que calcule el progreso de la
 * barra del carrito (`POST /api/gift-progress` → `hypestyle-gift/v1/evaluate`).
 *
 * Funciones puras, aparte del hook, para poder testear la cuenta sin React.
 *
 * El servidor recalcula TODO lo que puede desde cero (producto real, precio
 * real, cupón real): de acá solo salen identificadores de línea
 * (slug/talle/cantidad), nunca precios ni totales.
 *
 * La única excepción es `promo_discount`, y tiene su motivo: el descuento del
 * pack libre de Regular Tees (y el del 3x2 / CAMPEON50) se calcula con una
 * función del frontend (`lib/promo-pack-regular.ts`), que es la misma que le
 * muestra el precio al cliente y la que usa el servidor al cobrar. Ese
 * descuento SÍ resta del monto elegible cuando el pedido se crea
 * (`HPG_Eligibility::calculate_from_order`), así que sin mandarlo la barra
 * prometía de más: tres Regular individuales se comparaban contra el umbral
 * por su subtotal sin precio de pack. Mandarlo no abre nada — el plugin lo
 * acota a `[0, subtotal]`, con lo que solo puede BAJAR el progreso que se le
 * promete al cliente, y el regalo real se vuelve a decidir sobre el pedido.
 *
 * Lo que NUNCA va acá es el 10% por pagar con transferencia: no es un
 * descuento sobre la compra sino el ahorro por el medio de pago, y desde
 * hypestyle-purchase-gift v1.2.0 tampoco resta del lado del pedido (bug D12).
 */

/** Lo mínimo de una línea del carrito que necesita el cálculo. */
export interface GiftProgressLine {
  id: string;
  size: string;
  quantity: number;
}

export interface GiftProgressOptions {
  couponCode?: string;
  email?: string;
  /** Descuento de promo ya calculado (pack libre de Regular Tees, 3x2, CAMPEON50). */
  promoDiscount?: number;
}

/** Entero en pesos, nunca negativo ni NaN. */
function promoDiscount(opts?: GiftProgressOptions): number {
  const n = Math.round(Number(opts?.promoDiscount ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function giftProgressPayload(items: GiftProgressLine[], opts?: GiftProgressOptions) {
  return {
    items: items.map((i) => ({ slug: i.id, size: i.size, quantity: i.quantity })),
    coupon_codes: opts?.couponCode ? [opts.couponCode] : [],
    promo_discount: promoDiscount(opts),
    customer: { email: opts?.email ?? '' },
    currency: 'ARS',
  };
}

/**
 * Clave de caché del fetch: cambia solo cuando cambia algo que afecta el
 * cálculo. Si el descuento de promo no estuviera acá, agregar la tercera
 * Regular (que cambia el descuento del pack) no refrescaría la barra.
 */
export function giftProgressKey(items: GiftProgressLine[], opts?: GiftProgressOptions): string {
  return [
    JSON.stringify(items.map((i) => [i.id, i.size, i.quantity])),
    opts?.couponCode ?? '',
    opts?.email ?? '',
    promoDiscount(opts),
  ].join('|');
}
