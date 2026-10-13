import { describe, it, expect } from 'vitest';
import { sortCatalog, isNewProduct, effectivePrice } from '@/lib/mayorista-catalog-sort';
import type { MayoristaProduct } from '@/lib/mayorista-products';

const prod = (slug: string, ws: number, createdAt: string | undefined, extra: Partial<MayoristaProduct> = {}): MayoristaProduct => ({
  id: slug, productId: 1, name: slug, slug, category: 'Remera', shortDescription: '', wholesalePrice: ws, regularPrice: ws * 2,
  image: '', images: [], sizes: ['M'], colors: [], colorAxis: false, stock: { M: 'ok' }, stockQty: { M: 10 }, comingSoon: false, createdAt, ...extra,
});
const NOW = Date.parse('2026-10-13T12:00:00-03:00');
const catalog = [
  prod('viejo', 30000, '2026-07-11T10:00:00'),
  prod('caro', 55000, '2026-10-04T10:00:00'),
  prod('nuevo', 19500, '2026-10-12T10:00:00'),
  prod('promo', 40000, '2026-09-01T10:00:00', { promo: { campaignId: 'c', group: '10', label: '10% EXTRA', discount: 0.1, price: 36000, saving: 4000, badge: 'LIQ', tag: 'unidades-limitadas' } as any }),
  prod('sin-fecha', 25000, undefined),
];

describe('sortCatalog', () => {
  it('disponibilidad: devuelve el orden que trae el catálogo', () => {
    expect(sortCatalog(catalog, 'disponibilidad').map(p => p.slug)).toEqual(['viejo', 'caro', 'nuevo', 'promo', 'sin-fecha']);
  });
  it('novedades: lo último cargado primero; sin fecha al final', () => {
    expect(sortCatalog(catalog, 'novedades').map(p => p.slug)).toEqual(['nuevo', 'caro', 'promo', 'viejo', 'sin-fecha']);
  });
  it('precio: usa el precio con promo si hay campaña', () => {
    expect(effectivePrice(catalog[3])).toBe(36000);
    expect(sortCatalog(catalog, 'precio-asc').map(p => p.slug)).toEqual(['nuevo', 'sin-fecha', 'viejo', 'promo', 'caro']);
    expect(sortCatalog(catalog, 'precio-desc').map(p => p.slug)).toEqual(['caro', 'promo', 'viejo', 'sin-fecha', 'nuevo']);
  });
  it('no muta la lista original', () => {
    const copy = [...catalog];
    sortCatalog(catalog, 'precio-asc');
    expect(catalog).toEqual(copy);
  });
});

describe('isNewProduct', () => {
  it('cargado hace menos de 30 días y sin badge de drop', () => {
    expect(isNewProduct(prod('a', 1, '2026-10-12T10:00:00'), NOW)).toBe(true);
    expect(isNewProduct(prod('a', 1, '2026-09-20T10:00:00'), NOW)).toBe(true);
    expect(isNewProduct(prod('a', 1, '2026-09-01T10:00:00'), NOW)).toBe(false);
    expect(isNewProduct(prod('a', 1, '2026-10-12T10:00:00', { drop: true }), NOW)).toBe(false);
    expect(isNewProduct(prod('a', 1, undefined), NOW)).toBe(false);
    expect(isNewProduct(prod('a', 1, 'no-es-fecha'), NOW)).toBe(false);
  });
});
