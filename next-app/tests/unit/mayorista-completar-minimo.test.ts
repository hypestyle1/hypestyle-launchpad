import { describe, it, expect } from 'vitest';
import { completarMinimo } from '@/lib/mayorista-completar-minimo';
import type { MayoristaProduct } from '@/lib/mayorista-products';

const prod = (slug: string, name: string, ws: number, category: string, stock: Record<string, number>, promoPrice?: number, colorAxis = false): MayoristaProduct => ({
  id: slug, productId: 1, name, slug, category, shortDescription: '', wholesalePrice: ws, regularPrice: ws * 2, image: '', images: [],
  sizes: Object.keys(stock), colors: [], colorAxis,
  stock: Object.fromEntries(Object.entries(stock).map(([s, q]) => [s, q === 0 ? 'out' : q <= 5 ? 'low' : 'ok'])) as any,
  stockQty: stock,
  ...(promoPrice ? { promo: { campaignId: 'c', group: '10', label: '10% EXTRA', discount: 0.1, price: promoPrice, saving: ws - promoPrice, badge: 'LIQUIDACIÓN', tag: 'unidades-limitadas' } } : {}),
});
const catalog = [
  prod('lamb-of-god-pink-tee', 'LAMB OF GOD PINK TEE', 22500, 'Remera', { M: 30 }),                // best seller → nunca
  prod('pack-x3-medias-hype', 'Pack x3 Medias Hype', 14000, 'Accesorio', { 'Única': 74 }),          // accesorio básico barato
  prod('regular-tee-white', 'Regular Tee - White', 13000, 'Remera', { S: 0, M: 12, L: 12 }, 11700), // promo + básico
  prod('aerogrey-tees', 'AEROGREY - TEEs', 22500, 'Remera', { S: 27, M: 25 }, 20250),               // promo, stock alto
  prod('hoodie-grey-hstars', 'Hoodie Grey HStars', 44500, 'Hoodie', { L: 6 }),                      // best seller y caro
  prod('jersey-fileteado', 'JERSEY FILETEADO', 49000, 'Remera', { L: 17 }, 44100),                  // promo pero caro
  prod('trucker-cap-no-faith', 'TRUCKER CAP - NO FAITH, NO GLORY', 16000, 'Accesorio', { 'Única': 32 }, 14400),
  prod('sleeveless-ranglan', 'SLEEVELESS RANGLAN', 22500, 'Musculosa', { 'M / Black': 10 }, 20250, true), // color como eje → no se sugiere
  prod('agotado', 'AGOTADO TEE', 10000, 'Remera', { M: 0 }),
];

describe('completarMinimo', () => {
  it('prioriza promo barata, básicos y accesorios; excluye best sellers, caros, agotados y con color como eje', () => {
    const s = completarMinimo(catalog, new Set(), 88000);
    const slugs = s.map(x => x.slug);
    expect(slugs).not.toContain('lamb-of-god-pink-tee');
    expect(slugs).not.toContain('hoodie-grey-hstars');
    expect(slugs).not.toContain('jersey-fileteado');
    expect(slugs).not.toContain('sleeveless-ranglan');
    expect(slugs).not.toContain('agotado');
    expect(slugs.slice(0, 3)).toEqual(['regular-tee-white', 'trucker-cap-no-faith', 'aerogrey-tees']);
    expect(s[0]).toMatchObject({ size: 'M', unitPrice: 11700, promo: true, reason: 'promo', available: 12 });
    expect(slugs).toContain('pack-x3-medias-hype');
  });

  it('no repite lo que ya está en el carrito y respeta el límite', () => {
    const s = completarMinimo(catalog, new Set(['regular-tee-white', 'aerogrey-tees']), 88000, 2);
    expect(s.map(x => x.slug)).toEqual(['trucker-cap-no-faith', 'pack-x3-medias-hype']);
  });

  it('sin faltante no sugiere nada', () => {
    expect(completarMinimo(catalog, new Set(), 0)).toEqual([]);
  });

  it('elige el primer talle con stock (S agotado → M)', () => {
    const s = completarMinimo(catalog, new Set(), 50000).find(x => x.slug === 'regular-tee-white')!;
    expect(s.size).toBe('M');
  });
});
