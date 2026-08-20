/**
 * Cold Archive — fuente única de la campaña.
 *
 * El cierre tiene que coincidir con el `date_on_sale_to` que se cargó en
 * WooCommerce (scripts/sale-precios.mjs). Si los dos números difieren, el sitio
 * anuncia una fecha y los precios vuelven en otra.
 */

/** Fin del sale, hora local de Argentina. 20/09: el último día del invierno. */
export const SALE_END = new Date('2026-09-20T23:59:59-03:00');

/**
 * Texto de urgencia. A proposito NO lleva fecha: el sale termina cuando se
 * corta el stock, no en un dia calendario, y publicar una fecha obliga a
 * cumplirla. SALE_END sigue existiendo como tope tecnico — coincide con el
 * date_on_sale_to cargado en Woo — pero no se muestra.
 */
export const SALE_URGENCIA = 'Tiempo limitado';


/** Arranque del sale. Los precios se cargaron en Woo el 20/08. */
export const SALE_START = new Date('2026-08-20T00:00:00-03:00');

/** Descuento maximo publicado. Tiene que coincidir con el mayor de Woo. */
export const SALE_MAX_OFF = 50;

/**
 * Nombre de la campaña y su descriptor comercial. La jerarquía importa:
 * COLD ARCHIVE es el nombre y va primero; WINTER SALE solo explica de qué se
 * trata. Están acá y no sueltos en cada componente para que renombrar la
 * campaña sea un cambio en un archivo.
 */
export const SALE_NOMBRE = 'Cold Archive';
export const SALE_DESCRIPTOR = 'Winter Sale';

export function isSaleActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= SALE_START.getTime() && t <= SALE_END.getTime();
}
