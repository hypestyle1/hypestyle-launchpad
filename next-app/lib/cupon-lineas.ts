/**
 * Cuánto descuenta un cupón, línea por línea, con la MISMA cuenta que hace Woo
 * al crear el pedido.
 *
 * El problema que resuelve (auditoría HYPE10, 27-28/10/2026): el checkout
 * mostraba `subtotal × %` sobre TODO el carrito, pero HYPE10 es un cupón de
 * producto (`percent`, que en WC 11.2.1 está en `wc_get_product_coupon_types()`)
 * y tiene 12 Regular Tees en `excluded_product_ids`. Woo descuenta solo las
 * líneas elegibles: el resumen prometía un descuento que el pedido no iba a
 * tener — el mismo tipo de mentira del pedido #4092, donde el cliente vio
 * $52.648 y el mail de transferencia pidió $58.428.
 *
 * Quién decide qué línea es elegible: el backend, NO este módulo. El carrito
 * solo conoce slugs y la lista de exclusiones son ids de Woo, así que
 * `/validate-coupon` resuelve el slug y devuelve `items: [{ id, product_id,
 * eligible }]` (PHP v1.42.1). Acá no hay ninguna copia de la lista de
 * exclusiones: si mañana se agrega un producto al cupón, no se toca este código.
 *
 * La cuenta replica `WC_Discounts::apply_coupon_percent`: por cada línea
 * elegible, `floor(subtotal_en_centavos × %)`. Es floor por línea, no round
 * sobre el total.
 */

export type LineaCupon = { id: string; price: number; quantity: number };

/** Elegibilidad por línea tal como la devuelve /validate-coupon. */
export type ElegibilidadLinea = { id: string | number; product_id: number; eligible: boolean };

export type CuponAplicado = {
  type: string;
  amount: number;
  /** Ausente contra un backend que todavía no entiende el contrato. */
  items?: ElegibilidadLinea[] | null;
};

function mapa(cupon: CuponAplicado | null | undefined): Map<string, boolean> | null {
  if (!cupon?.items || !Array.isArray(cupon.items) || cupon.items.length === 0) return null;
  const m = new Map<string, boolean>();
  for (const it of cupon.items) m.set(String(it.id), it.eligible !== false);
  return m;
}

/**
 * ¿Esta línea cobra el descuento? Una línea que el backend no informó se toma
 * como elegible: es lo que Woo va a hacer con ella, y asumir lo contrario le
 * negaría al cliente un descuento que el pedido sí le va a dar. Pasa solo entre
 * que se agrega un producto y que se revalida (ver `faltaElegibilidad`).
 */
function esElegible(linea: LineaCupon, m: Map<string, boolean> | null): boolean {
  if (!m) return true;
  const v = m.get(String(linea.id));
  return v === undefined ? true : v;
}

export function descuentoCupon(lineas: LineaCupon[], cupon: CuponAplicado | null | undefined): number {
  if (!cupon) return 0;
  const sub = lineas.reduce((s, l) => s + l.price * l.quantity, 0);
  // Monto fijo = cupón de CARRITO (`fixed_cart`): Woo no aplica restricciones de
  // producto, descuenta del total y nunca más que el subtotal.
  if (cupon.type !== 'percent') return Math.min(cupon.amount, sub);

  const m = mapa(cupon);
  let centavos = 0;
  for (const l of lineas) {
    if (!esElegible(l, m)) continue;
    const subLinea = Math.round(l.price * l.quantity * 100);
    centavos += Math.floor((subLinea * cupon.amount) / 100);
  }
  return centavos / 100;
}

/** Las líneas que el cupón NO descuenta, para avisarlo en el resumen. */
export function lineasExcluidasDelCupon(lineas: LineaCupon[], cupon: CuponAplicado | null | undefined): LineaCupon[] {
  const m = mapa(cupon);
  if (!cupon || cupon.type !== 'percent' || !m) return [];
  return lineas.filter((l) => !esElegible(l, m));
}

/**
 * ¿Hay líneas sin elegibilidad informada? Pasa cuando el carrito cambia después
 * de aplicar el código. Quien llame revalida (el checkout lo hace con debounce)
 * para que el número del resumen siga siendo el del pedido.
 */
export function faltaElegibilidad(lineas: LineaCupon[], cupon: CuponAplicado | null | undefined): boolean {
  const m = mapa(cupon);
  if (!m) return false;
  return lineas.some((l) => !m.has(String(l.id)));
}
