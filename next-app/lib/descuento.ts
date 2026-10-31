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
 * - Redondea hacia ABAJO. Con precios terminados en $900 el descuento real
 *   casi nunca cae justo en un escalón de 5%, y declarar de menos es legal y
 *   honesto; declarar de más, no.
 * - Devuelve `null` por debajo del 5%: un "−3%" no es una oferta, es ruido.
 * - Devuelve `null` si no hay precio anterior, o si no es mayor al actual.
 *   Sin referencia verificable no se muestra ni tachado ni porcentaje.
 */
export function porcentajeDescuento(
  precio: number,
  precioAnterior?: number | null,
): number | null {
  if (!precioAnterior || !(precio > 0) || precioAnterior <= precio) return null;
  // El épsilon no es cosmético: 1 − 29700/33000 da 0,09999999999999998 en
  // coma flotante, y el piso lo convertía en −9% cuando el descuento es
  // exactamente 10%. Sin esto, un −50% justo se publicaría como −49%.
  const off = Math.floor((1 - precio / precioAnterior) * 100 + 1e-9);
  return off >= 5 ? off : null;
}
