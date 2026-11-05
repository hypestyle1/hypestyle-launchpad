// Orden y novedad del catálogo mayorista (puro, sin red).
//
// El catálogo llega ordenado por disponibilidad (lib/mayorista-products.ts:
// drop → pedibles → stock). Acá viven las otras vistas que pide un local:
// novedades (lo último que entró a Woo) y precio. El badge "Nuevo" marca lo
// cargado en los últimos NEW_DAYS, salvo lo que ya lleva "Nuevo drop".

import { isPurchasable, type MayoristaProduct } from './mayorista-products';

export type CatalogSort = 'mas-vendidos' | 'disponibilidad' | 'novedades' | 'precio-asc' | 'precio-desc';

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  'mas-vendidos': 'Más vendidos',
  disponibilidad: 'Disponibilidad',
  novedades: 'Novedades',
  'precio-asc': 'Precio: menor a mayor',
  'precio-desc': 'Precio: mayor a menor',
};

export const NEW_DAYS = 30;

/** Precio que paga el mayorista hoy (promo de campaña si hay). */
export function effectivePrice(p: Pick<MayoristaProduct, 'wholesalePrice' | 'promo'>): number {
  return p.promo?.price ?? p.wholesalePrice;
}

/** Cargado en Woo hace menos de NEW_DAYS. Lo del drop no: ya tiene su badge. */
export function isNewProduct(p: Pick<MayoristaProduct, 'createdAt' | 'drop'>, now = Date.now(), days = NEW_DAYS): boolean {
  if (p.drop || !p.createdAt) return false;
  const t = Date.parse(p.createdAt);
  if (!Number.isFinite(t)) return false;
  return now - t < days * 86_400_000 && t <= now + 86_400_000;
}

/** Nueva lista ordenada; 'disponibilidad' respeta el orden que ya trae el catálogo. */
export function sortCatalog(products: MayoristaProduct[], sort: CatalogSort): MayoristaProduct[] {
  if (sort === 'disponibilidad') return products;
  const withIndex = products.map((p, i) => ({ p, i }));
  const time = (p: MayoristaProduct) => { const t = Date.parse(p.createdAt ?? ''); return Number.isFinite(t) ? t : 0; };
  withIndex.sort((a, b) => {
    switch (sort) {
      // Más vendidos (unidades pagadas 60 días, lib/mayorista-best-sellers.ts):
      // lo pedible primero; empate → orden de disponibilidad.
      case 'mas-vendidos': return Number(isPurchasable(b.p)) - Number(isPurchasable(a.p)) || (b.p.sales ?? 0) - (a.p.sales ?? 0) || a.i - b.i;
      case 'novedades': return time(b.p) - time(a.p) || a.i - b.i;
      case 'precio-asc': return effectivePrice(a.p) - effectivePrice(b.p) || a.i - b.i;
      case 'precio-desc': return effectivePrice(b.p) - effectivePrice(a.p) || a.i - b.i;
      default: return a.i - b.i;
    }
  });
  return withIndex.map(x => x.p);
}
