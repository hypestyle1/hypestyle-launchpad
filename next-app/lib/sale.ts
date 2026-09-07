/**
 * Cold Archive — fuente única de la campaña.
 *
 * El cierre tiene que coincidir con el momento en que se sacan los precios de
 * oferta de WooCommerce. Si los dos números difieren, el sitio anuncia una cosa
 * y los precios dicen otra.
 */

/**
 * Fin del sale, hora local de Argentina.
 *
 * CERRADO el 06/09/2026. La fecha original era el 20/09 —el último día del
 * invierno— pero la campaña se cortó dos semanas antes y el Winter Sale que iba
 * a arrancar el 10/09 quedó sin definir. El mismo día se limpiaron los 89
 * productos rebajados de Woo (`META/cerrar-sale.mjs`) y se pausó la campaña de
 * Meta, así que la fecha de acá es la que apaga el branding de campaña en el
 * sitio: banda del home, píldora roja de la barra de anuncios y héroe de
 * /special-prices.
 *
 * Los 13 productos de la línea Regular Tees siguen rebajados a propósito. Eso es
 * una promo permanente, no la campaña: aparecen con su precio tachado y su badge
 * de descuento como cualquier producto en oferta, sin branding de Cold Archive.
 */
export const SALE_END = new Date('2026-09-06T23:59:59-03:00');

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
