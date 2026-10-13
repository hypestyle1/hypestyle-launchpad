// FIRST10 — campaña newsletter SS27 (13/10/2026): los primeros 10 pedidos desde
// $100.000 con el código FIRST10 se llevan el Pack x3 Medias Hype White a $0.
//
// La mecánica vive en WordPress (PHP/hypestyle-first10.php): Woo valida el
// cupón al crear el pedido y el mu-plugin agrega la línea de regalo bajo lock.
// Acá solo hay helpers puros para el checkout y la creación del pedido.

export const FIRST10_CODE = 'FIRST10';
/** Meta de línea que marca el regalo en el pedido de Woo. */
export const FIRST10_LINE_META = '_hypestyle_gift_first10';

export function esFirst10(code: string | null | undefined): boolean {
  return String(code ?? '').trim().toUpperCase() === FIRST10_CODE;
}

/** Bloque `first10` que devuelve validate-coupon cuando el código es FIRST10. */
export interface First10Info {
  product_id: number;
  name: string;
  slug: string;
  image?: string;
  remaining: number;
  until?: string | null;
  min: number;
}

/**
 * ¿El error de WC REST al crear el pedido es por el cupón? Woo responde 400 con
 * `woocommerce_rest_invalid_coupon` o un código de WC_Discounts
 * (`woocommerce_rest_coupon_usage_limit_reached`, `..._minimum_amount`, etc.).
 */
export function errorEsDeCupon(status: number, body: string): boolean {
  if (status !== 400) return false;
  return /coupon|cup[oó]n/i.test(body);
}

interface WcLineItem { name?: string; quantity?: number; total?: string; meta_data?: { key?: string; value?: unknown }[] }

/** La línea de regalo FIRST10 de un pedido de Woo, lista para el mail de confirmación. */
export function regaloFirst10DeLineas(lineItems: WcLineItem[] | undefined | null): { name: string; size: string; quantity: number; price: number } | null {
  for (const li of lineItems ?? []) {
    const es = (li.meta_data ?? []).some((m) => m.key === FIRST10_LINE_META && String(m.value) === 'yes');
    if (es) return { name: li.name || 'Pack x3 Medias Hype White — Regalo FIRST10', size: 'Único', quantity: li.quantity || 1, price: 0 };
  }
  return null;
}

/** Texto corto para el checkout cuando el código ya está aplicado. */
export function textoFirst10(info: First10Info): string {
  const quedan = info.remaining === 1 ? 'queda 1 regalo' : `quedan ${info.remaining} regalos`;
  return `${info.name} de regalo con tu compra. Hoy ${quedan}.`;
}
