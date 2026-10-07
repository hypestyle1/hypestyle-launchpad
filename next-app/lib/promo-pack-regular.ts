/**
 * Pack libre de Regular Tees: 3 remeras Regular individuales, de cualquier
 * color y talle, se cobran al precio del 3-PACK. Antes solo existían los packs
 * fijos (mono o una de cada color) y quien quería, por ejemplo, 2 negras y 1
 * blanca pagaba 3 individuales o escribía por WhatsApp.
 *
 * El precio del pack no se hardcodea: sale del catálogo (el 3-PACK Black), así
 * que si se cambia en Woo, el pack libre lo sigue solo. Si el catálogo no lo
 * trae, no hay descuento.
 *
 * Lo usan el carrito, el checkout y el servidor (lib/precio-servidor), con la
 * misma cuenta: lo que se muestra es lo que se cobra.
 */
export const PACK_REGULAR_SLUGS: ReadonlySet<string> = new Set([
  'regular-tee-black',
  'regular-tee-white',
  'regular-tee-navy',
  'regular-tee-melange',
]);
export const PACK_REGULAR_REF_SLUG = 'regular-tees-3-pack-black';
export const PACK_REGULAR_UNIDADES = 3;

export interface PackRegularLine {
  id: string;
  price: number;
  quantity: number;
}

/** Precio del pack según un catálogo slug → precio (o lista de productos). */
export function precioPackRegular(
  catalogo: Map<string, number> | ReadonlyArray<{ slug: string; price: number }>,
): number | null {
  const precio = catalogo instanceof Map
    ? catalogo.get(PACK_REGULAR_REF_SLUG)
    : catalogo.find((p) => p.slug === PACK_REGULAR_REF_SLUG)?.price;
  return precio && precio > 0 ? precio : null;
}

function unidadesRegular(lines: PackRegularLine[]): number[] {
  const units: number[] = [];
  for (const l of lines) {
    if (!PACK_REGULAR_SLUGS.has(l.id)) continue;
    for (let i = 0; i < l.quantity; i++) units.push(l.price);
  }
  return units.sort((a, b) => b - a);
}

/**
 * Por cada 3 Regular individuales, la diferencia entre lo que suman y el precio
 * del pack. Nunca negativo: si las individuales están más baratas que el pack
 * (una oferta puntual), se cobran como individuales.
 */
export function computePackRegularDiscount(lines: PackRegularLine[], precioPack: number | null | undefined): number {
  if (!precioPack || precioPack <= 0) return 0;
  const units = unidadesRegular(lines);
  let total = 0;
  for (let i = 0; i + PACK_REGULAR_UNIDADES <= units.length; i += PACK_REGULAR_UNIDADES) {
    const suma = units[i] + units[i + 1] + units[i + 2];
    total += Math.max(0, suma - precioPack);
  }
  return Math.round(total);
}

/** Cuántas Regular faltan para el próximo pack. 0 si no hay ninguna o ya cierra justo. */
export function packRegularFaltan(lines: PackRegularLine[]): number {
  const n = unidadesRegular(lines).length;
  const rem = n % PACK_REGULAR_UNIDADES;
  return n === 0 || rem === 0 ? 0 : PACK_REGULAR_UNIDADES - rem;
}
