/**
 * Winter Sale — fuente única de la campaña.
 *
 * El cierre tiene que coincidir con el `date_on_sale_to` que se cargó en
 * WooCommerce (scripts/sale-precios.mjs). Si los dos números difieren, el sitio
 * anuncia una fecha y los precios vuelven en otra.
 */

/** Fin del sale, hora local de Argentina. 20/09: el último día del invierno. */
export const SALE_END = new Date('2026-09-20T23:59:59-03:00');

/** "20.09" — para el contador y el copy del héroe. */
export const SALE_END_LABEL = '20.09';

/** Días completos que faltan para el cierre. 0 el último día, null si ya pasó. */
export function saleDaysLeft(now: Date = new Date()): number | null {
  const ms = SALE_END.getTime() - now.getTime();
  if (ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}
