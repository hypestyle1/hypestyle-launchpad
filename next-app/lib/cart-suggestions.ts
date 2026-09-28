import type { NormalizedProduct } from './products-normalize';

/**
 * "Completa el look" del carrito: qué ofrecer según lo que ya hay adentro.
 *
 * Antes eran 4 productos al azar de todo el catálogo. Ahora se puntúa cada
 * candidato contra lo que hay en el carrito:
 *
 *   1. La otra mitad del conjunto (mismo diseño, otra prenda): si llevás el
 *      SweatPant Grey HStars, primero va el Hoodie Grey HStars.
 *   2. El mismo diseño en otro color, siempre que sea otra prenda.
 *   3. Lo que salió en el mismo drop (tag de colección compartido).
 *   4. Una prenda que complemente: parte de abajo o accesorio si llevás parte
 *      de arriba, y al revés.
 *   5. Best sellers, como desempate y como relleno cuando no hay nada mejor.
 *
 * Nunca se ofrece algo sin talles disponibles, ni lo que ya está en el carrito.
 *
 * El diseño se deduce del slug (no hay un campo "conjunto" en Woo): se sacan las
 * palabras de prenda y de color, y lo que queda identifica el diseño.
 * `hoodie-grey-hstars` y `sweatpant-grey-hstars` quedan los dos en `hstars`.
 */

type Group = 'top' | 'bottom' | 'accessory' | 'bundle' | 'other';

const GROUP_BY_CATEGORY: Record<string, Group> = {
  hoodie: 'top', tee: 'top', remera: 'top', longsleeve: 'top', top: 'top',
  musculosa: 'top', campera: 'top', polo: 'top', sweater: 'top',
  'pantalón': 'bottom', pantalon: 'bottom', jort: 'bottom', short: 'bottom',
  accesorio: 'accessory',
  set: 'bundle', pack: 'bundle',
};

// Palabras del slug que nombran la prenda, no el diseño.
const GARMENT_WORDS = new Set([
  'hoodie', 'zip', 'sweatpant', 'sweatpants', 'tee', 'tees', 'tshirt', 'jort',
  'cargo', 'longsleeve', 'cap', 'trucker', 'beanie', 'crewneck', 'sweater',
  'jacket', 'fleece', 'polo', 'half', 'top', 'tops', 'tanktops', 'sleeveless',
  'sleveless', 'raglan', 'ranglan', 'jersey', 'pack', 'set', 'combo', 'full',
  'regular', 'waffle', 'mesh', 'knitted', 'ring', 'chain', 'medias', 'zippo',
]);

const COLOR_WORDS = new Set([
  'black', 'white', 'grey', 'gris', 'pink', 'navy', 'melange', 'green', 'blue',
  'brown', 'olive', 'sand', 'taupe', 'graphite', 'bordo', 'wheat', 'pearl',
  'earth', 'militar', 'negro', 'negra', 'blanca', 'blanco', 'azul', 'beige',
  'silver', 'stone', 'wash', 'negrogris',
]);

// Palabras que están en medio catálogo y no distinguen un diseño de otro.
const NOISE_WORDS = new Set([
  'hype', 'hs', 'co', 'style', 'the', 'for', 'of', 'x', 'by', 'and', 'a', 'i',
  'so', 'me', 'no', 'v1', 'v2',
]);

// Tags que marcan vidriera, no colección: compartirlos no dice nada.
const GENERIC_TAGS = new Set([
  'best-seller', 'special-price', 'new-in', 'fw26', 'summer-26', 'regular-tee',
]);

const BEST_SELLER_TAG = 'best-seller';

/** Lo mínimo que se necesita del carrito: el slug de cada línea. */
export interface CartLine {
  id: string;
  isGift?: boolean;
}

function words(slug: string): string[] {
  return slug.toLowerCase().split('-').filter(w => w && !/^\d+$/.test(w));
}

export function designWords(slug: string): string[] {
  return words(slug).filter(
    w => !GARMENT_WORDS.has(w) && !COLOR_WORDS.has(w) && !NOISE_WORDS.has(w),
  );
}

function colorWords(slug: string): string[] {
  return words(slug).filter(w => COLOR_WORDS.has(w));
}

export function groupOf(p: Pick<NormalizedProduct, 'category'>): Group {
  return GROUP_BY_CATEGORY[p.category.trim().toLowerCase()] ?? 'other';
}

function hasStock(p: NormalizedProduct): boolean {
  return p.price > 0 && p.sizes.some(s => p.stock[s] !== 'out');
}

function shares(a: string[], b: string[]): boolean {
  return a.some(x => b.includes(x));
}

function complements(a: Group, b: Group): boolean {
  if (a === 'top') return b === 'bottom' || b === 'accessory';
  if (a === 'bottom') return b === 'top' || b === 'accessory';
  if (a === 'accessory') return b === 'top' || b === 'bottom';
  return false;
}

/** Puntaje de un candidato contra una línea del carrito. */
function scoreAgainst(candidate: NormalizedProduct, inCart: NormalizedProduct): number {
  const cDesign = designWords(candidate.slug);
  const iDesign = designWords(inCart.slug);
  // Los lisos no tienen diseño en el nombre (`hoodie-pink`, `sweatpant-pink`):
  // ahí el conjunto lo arma el color.
  const plainSet = cDesign.length === 0 && iDesign.length === 0
    && shares(colorWords(candidate.slug), colorWords(inCart.slug));
  const sameDesign = shares(cDesign, iDesign) || plainSet;
  const cGroup = groupOf(candidate);
  const iGroup = groupOf(inCart);
  const otherGarment = cGroup !== iGroup;
  let score = 0;

  if (sameDesign) {
    // El combo que incluye lo que ya tenés sería comprarlo dos veces.
    if (cGroup === 'bundle' || iGroup === 'bundle') return -1;
    // La misma prenda en otro color no completa nada: queda como relleno.
    if (!otherGarment) return 0;
    {
      const cColors = colorWords(candidate.slug);
      const iColors = colorWords(inCart.slug);
      const sameColor = cColors.length === 0 || iColors.length === 0 || shares(cColors, iColors);
      score += sameColor ? 100 : 60;
    }
  }

  const drop = (p: NormalizedProduct) => p.tags.filter(t => !GENERIC_TAGS.has(t));
  if (shares(drop(candidate), drop(inCart))) score += 30;
  if (complements(iGroup, cGroup)) score += 20;

  return score;
}

/**
 * Hasta `limit` sugerencias para el carrito, de mejor a peor.
 * `rand` solo desempata entre candidatos con el mismo puntaje, para que el
 * relleno no sea siempre el mismo; los tests le pasan uno fijo.
 */
export function suggestForCart(
  cart: CartLine[],
  products: NormalizedProduct[],
  limit = 4,
  rand: () => number = Math.random,
): NormalizedProduct[] {
  const cartSlugs = new Set(cart.map(l => l.id));
  const bySlug = new Map(products.map(p => [p.slug, p]));
  const inCart = cart
    .filter(l => !l.isGift)
    .map(l => bySlug.get(l.id))
    .filter((p): p is NormalizedProduct => Boolean(p));

  const scored: { p: NormalizedProduct; score: number; tie: number }[] = [];
  for (const p of products) {
    if (cartSlugs.has(p.slug) || !hasStock(p)) continue;
    const perLine = inCart.map(i => scoreAgainst(p, i));
    if (perLine.some(s => s < 0)) continue;
    const best = perLine.length ? Math.max(...perLine) : 0;
    const score = best + (p.tags.includes(BEST_SELLER_TAG) ? 5 : 0);
    scored.push({ p, score, tie: rand() });
  }

  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
  return scored.slice(0, limit).map(s => s.p);
}
