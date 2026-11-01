import type { NormalizedProduct } from './products-normalize';

export const CYBER_INITIAL_COUNT = 24;
export const CYBER_EXPANDED_COUNT = 36;

export function cyberCategoryMatches(category: string, filter: { id: string; cats: string[] }): boolean {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const value = normalize(category);
  if (filter.id === 'bottoms') return ['pantalon', 'pantalones', 'pant', 'pants', 'jort', 'jorts', 'short', 'shorts', 'bermuda', 'bermudas'].includes(value);
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
