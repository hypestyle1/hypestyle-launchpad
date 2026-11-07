import type { NormalizedProduct } from './products-normalize';

export const CYBER_INITIAL_COUNT = 24;
export const CYBER_EXPANDED_COUNT = 36;

/**
 * Nombres crudos de Woo \u2192 nombre can\u00f3nico de la grilla.
 *
 * Bug 7/11: el cat\u00e1logo arranca con productos normalizados (`fromWPNode` mapea
 * "remera" \u2192 "Tee"), pero cuando entran los precios en vivo del Cyber
 * (/api/cyber-products-live) la categor\u00eda llega con el nombre crudo de Woo
 * ("Remera"). El filtro Tees comparaba contra "Tee" y quedaba vac\u00edo. Se compara
 * siempre el nombre can\u00f3nico, venga de donde venga el producto.
 */
const CATEGORIA_CANONICA: Record<string, string> = {
  remera: 'tee', remeras: 'tee', tees: 'tee',
  musculosa: 'top',
  campera: 'hoodie', sweater: 'hoodie',
};

export function cyberCategoryMatches(category: string, filter: { id: string; cats: string[] }): boolean {
  const base = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalize = (s: string) => CATEGORIA_CANONICA[base(s)] ?? base(s);
  if (filter.id === 'bottoms') return ['pantalon', 'pantalones', 'pant', 'pants', 'jort', 'jorts', 'short', 'shorts', 'bermuda', 'bermudas'].includes(base(category));
  const value = normalize(category);
  return filter.cats.some(c => normalize(c) === value);
}

/** Orden comercial estable, con stock primero; nunca suma pilas compartidas. */
export function cyberCatalogOrder(products: NormalizedProduct[], slugs: string[]): NormalizedProduct[] {
  const ranks = new Map(slugs.map((slug, i) => [slug, i]));
  const hasStock = (p: NormalizedProduct) => Object.values(p.stock ?? {}).some(s => s !== 'out');
  return [...products].sort((a,b) => Number(hasStock(b)) - Number(hasStock(a))
    || (ranks.get(a.slug) ?? slugs.length) - (ranks.get(b.slug) ?? slugs.length));
}

/** Precio de presentación: antes de apertura es preview; después manda Woo. */
export function cyberCardPrice(price: number, reference: { price: number; originalPrice: number } | undefined, preview: boolean) {
  if (!reference || (!preview && price >= reference.originalPrice)) return undefined;
  return { price: preview ? reference.price : price, originalPrice: reference.originalPrice };
}
