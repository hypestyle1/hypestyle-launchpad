import { describe, it, expect } from 'vitest';
import fixture from '../fixtures/private-stock-sale.json';
import { validateCampaign, type WholesaleCampaign } from '@/lib/wholesale-campaigns';
import { decorateCatalog, campaignBanner, filterByPromo, sortPromoFirst, endsLabel, promoTagOf } from '@/lib/mayorista-campaign-view';
import { signPreviewToken, verifyPreviewToken } from '@/lib/mayorista-preview-token';
import type { MayoristaProduct } from '@/lib/mayorista-products';

const { campaign: PSS } = validateCampaign(fixture.campaign) as { campaign: WholesaleCampaign };
const DURING = '2026-09-28T15:00:00-03:00', AFTER = '2026-10-03T00:00:01-03:00';

const prod = (productId: number, slug: string, name: string, regular: number, category = 'Remera'): MayoristaProduct => ({
  id: slug, productId, name, slug, category, shortDescription: '', wholesalePrice: Math.round(regular / 2), regularPrice: regular,
  image: '', images: [], sizes: ['M'], colors: [], colorAxis: false, stock: { M: 'ok' }, stockQty: { M: 10 },
});
const catalog = [
  prod(2107, 'lamb-of-god', 'LAMB OF GOD PINK TEE', 45000),
  prod(713, 'find-jesus', 'FIND JESUS - LONGSLEEVE BLACK', 67000, 'Longsleeve'),
  prod(2460, 'napoli-azurro', 'NAPOLI TEE - AZURRO', 38000),
  prod(726, 'aerogrey', 'AEROGREY - TEEs', 45000),
];

describe('decorateCatalog', () => {
  it('cuelga la promo vigente: precio, ahorro, grupo, badge y etiqueta', () => {
    const d = decorateCatalog(catalog, [PSS], DURING);
    expect(d[0].promo).toBeUndefined(); // Lamb of God, fuera de campaña
    expect(d[1].promo).toMatchObject({ campaignId: PSS.id, group: '20', label: '20% EXTRA', discount: 0.2, price: 26800, saving: 6700, badge: 'LIQUIDACIÓN', tag: 'sin-reposicion' });
    expect(d[2].promo).toMatchObject({ group: '15', price: 16150, tag: 'unidades-limitadas' });
    expect(d[3].promo).toMatchObject({ group: '10', price: 20250, tag: 'sin-reposicion' });
  });
  it('fuera de fechas nadie tiene promo', () => {
    expect(decorateCatalog(catalog, [PSS], AFTER).every(p => !p.promo)).toBe(true);
    expect(decorateCatalog(catalog, [], DURING).every(p => !p.promo)).toBe(true);
  });
  it('"Sin reposición" solo con note en el ítem; el resto "Unidades limitadas"', () => {
    expect(promoTagOf(PSS, 713)).toBe('sin-reposicion');
    expect(promoTagOf(PSS, 29)).toBe('sin-reposicion');
    expect(promoTagOf(PSS, 815)).toBe('sin-reposicion');
    expect(promoTagOf(PSS, 1571)).toBe('sin-reposicion');
    for (const id of [726, 629, 611]) expect(promoTagOf(PSS, id)).toBe('sin-reposicion');
    expect(promoTagOf(PSS, 2460)).toBe('unidades-limitadas');
    expect(promoTagOf(PSS, 337)).toBe('unidades-limitadas');
  });
});

describe('campaignBanner', () => {
  it('arma el hero con HASTA 20%, fechas, CTA por defecto y conteo por grupo sobre el catálogo', () => {
    const b = campaignBanner(catalog, [PSS], DURING)!;
    expect(b).toMatchObject({ id: PSS.id, badge: 'LIQUIDACIÓN', headline: PSS.headline, maxDiscount: 0.2, cta: 'Ver la liquidación', productCount: 3 });
    expect(b.groups).toEqual([
      { key: '20', label: '20% EXTRA', discount: 0.2, count: 1 },
      { key: '15', label: '15% EXTRA', discount: 0.15, count: 1 },
      { key: '10', label: '10% EXTRA', discount: 0.1, count: 1 },
    ]);
    expect(b.secondary).toBe('Próximo drop 04.10');
  });
  it('null sin campaña vigente (futura, vencida, draft)', () => {
    expect(campaignBanner(catalog, [PSS], AFTER)).toBeNull();
    expect(campaignBanner(catalog, [{ ...PSS, status: 'draft' }], DURING)).toBeNull();
  });
  it('cta y secondary configurables pisan los defaults', () => {
    const b = campaignBanner(catalog, [{ ...PSS, cta: 'Armar pedido', secondary: 'Solo hasta agotar' }], DURING)!;
    expect(b.cta).toBe('Armar pedido');
    expect(b.secondary).toBe('Solo hasta agotar');
  });
});

describe('filtros y orden', () => {
  const d = decorateCatalog(catalog, [PSS], DURING);
  it('Solo liquidación y por grupo', () => {
    expect(filterByPromo(d, 'promo').map(p => p.productId)).toEqual([713, 2460, 726]);
    expect(filterByPromo(d, { group: '10' }).map(p => p.productId)).toEqual([726]);
    expect(filterByPromo(d, 'all')).toHaveLength(4);
  });
  it('promo primero, mayor descuento antes, estable después', () => {
    expect(sortPromoFirst(d).map(p => p.productId)).toEqual([713, 2460, 726, 2107]);
  });
  it('endsLabel en hora Argentina', () => {
    expect(endsLabel(PSS.endsAt)).toBe('Termina el 02.10 · 23:59');
  });
});

describe('preview token', () => {
  const S = 'secreto-de-prueba';
  it('firma y verifica; vence a las 2 h; rechaza firma o id alterados', () => {
    const t = signPreviewToken(PSS.id, 1_000_000, S);
    expect(verifyPreviewToken(t, 1_000_000, S)).toBe(PSS.id);
    expect(verifyPreviewToken(t, 1_000_000 + 2 * 3600 * 1000 + 1, S)).toBeNull();
    expect(verifyPreviewToken(t.replace(PSS.id, 'otra'), 1_000_000, S)).toBeNull();
    expect(verifyPreviewToken(t.slice(0, -2) + 'xx', 1_000_000, S)).toBeNull();
    expect(verifyPreviewToken(t, 1_000_000, 'otro-secreto')).toBeNull();
    expect(verifyPreviewToken(null, 1_000_000, S)).toBeNull();
  });
});
