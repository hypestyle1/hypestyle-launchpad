/**
 * Curaduría de la home post-Cyber (9/11/2026) — fuente única para que ningún
 * producto se repita en el recorrido (pedido de Valentín: "mostrar la mayor
 * cantidad de productos posible en el menor recorrido, sin repetir").
 *
 * Orden de la home: Lo más elegido → Camo Sets (tag camo-set-drop) → SS27 →
 * Regular Tees (pack libre) → Mystery → Best sellers (FW26 primero).
 * Best sellers saca todo lo que ya apareció arriba con `yaMostradosArriba`.
 */

/**
 * Lo más elegido: los 8 que más facturaron en 90 días (pedidos pagados
 * 11/08–09/11) con stock, UNO por línea para dar variedad. Fuera a propósito:
 * 3 PACK y Regular (tienen su sección), camo (su sección), HStars repetido
 * (el hoodie gris queda en el grupo FW26 de Best sellers).
 *
 *   producto                    90 d             stock 9/11
 *   Faith Camo Hoodie           24 u · $1,71M    9
 *   SweatPant Black HStars      19 u · $1,37M   20
 *   Running Horses Waffle LS    29 u · $1,36M   18
 *   Half-Zip Polo Black         15 u · $0,92M   16
 *   Only God Can Judge Me Bl.   19 u · $0,69M   20
 *   Lamb Of God Pink Tee        21 u · $0,57M   25
 *   Find Jesus Longsleeve       12 u · $0,54M   54
 *   Napoli Tee Azurro           17 u · $0,52M  102
 */
export const MAS_ELEGIDOS_SLUGS = [
  'faith-over-everything-camo-hoodie',
  'sweatpant-black-hstars',
  'longsleeve-waffle-horses',
  'half-zip-polo-black',
  'only-god-can-judge-me-blanca',
  'lamb-of-god-pink-tee',
  'find-jesus-longsleeve-black',
  'napoli-tee-azul',
];

/** Tag de Woo de la colección camo (zip hoodie + jort Olive/Brown, gorras). */
export const CAMO_TAG = 'camo-set-drop';

/** Regular Tees y packs: viven en su sección propia. */
export const REGULAR_PREFIJOS = ['regular-tee-', 'regular-tees-3-pack'];

export function yaMostradosArriba(p: { slug: string; tags?: string[] }): boolean {
  return (
    MAS_ELEGIDOS_SLUGS.includes(p.slug) ||
    (p.tags ?? []).includes(CAMO_TAG) ||
    REGULAR_PREFIJOS.some((x) => p.slug.startsWith(x))
  );
}
