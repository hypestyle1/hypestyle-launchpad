/**
 * Porcentaje de descuento que se muestra en la píldora roja.
 *
 * Una sola definición para la grilla (`ProductCard`) y la ficha: si cada una
 * hiciera su cuenta, tarde o temprano una mostraría −25% y la otra −26% para
 * el mismo producto.
 *
 * Reglas, y el porqué de cada una:
 *
 * - Sale de los DOS precios reales de Woo (`regular_price` y `sale_price`).
 *   No hay ningún porcentaje escrito por producto en el código.
 * - Redondea al entero más cercano, como el porcentaje visible de la ficha.
 *   Solo presentación: no modifica precios ni importes de descuentos.
 * - Devuelve `null` por debajo del 5%: un "−3%" no es una oferta, es ruido.
 * - Devuelve `null` si no hay precio anterior, o si no es mayor al actual.
 *   Sin referencia verificable no se muestra ni tachado ni porcentaje.
 */
export function porcentajeDescuento(
  precio: number,
  precioAnterior?: number | null,
): number | null {
  if (!precioAnterior || !(precio > 0) || precioAnterior <= precio) return null;
  const exacto = (1 - precio / precioAnterior) * 100;
  return exacto + 1e-9 >= 5 ? Math.round(exacto) : null;
}
