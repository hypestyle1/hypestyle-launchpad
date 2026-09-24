import { describe, it, expect } from 'vitest';
import fixture from '../fixtures/private-stock-sale.json';
import {
  validateCampaign, effectiveStatus, isCampaignLive, campaignDiscountFor, overlappingProducts,
  campaignPrice, applyCampaign, campaignPreview, mergeCampaigns, expireCampaigns, arDate,
  type WholesaleCampaign, type PreviewProduct,
} from '@/lib/wholesale-campaigns';
import { priceLines } from '@/lib/mayorista-pricing';
import type { ResolvedProduct } from '@/lib/mayorista-stock';

// Campaña real: HYPE WHOLESALE — PRIVATE STOCK SALE, 24/09 → 02/10/2026,
// 35 productos en 20% / 15% / 10% EXTRA. El fixture es la foto de stock, PVP
// y costo del 24/09 con la que se aprobó la selección.

const { campaign: PSS } = validateCampaign(fixture.campaign) as { campaign: WholesaleCampaign };
const PRODUCTS = fixture.products as PreviewProduct[];
const EXPECTED = fixture.expected;

const DURING = '2026-09-28T15:00:00-03:00';
const BEFORE = '2026-09-24T17:59:59-03:00';
const AFTER  = '2026-10-03T00:00:01-03:00';

const stock = { status: 'publish', stockStatus: 'instock', manageStock: true, stockQuantity: 20 };
const resolved = new Map<string, ResolvedProduct | null>([
  // Find Jesus longsleeve: PVP $67.000 → WS $33.500 → 20% EXTRA $26.800
  ['find-jesus', { product_id: 713, stock, regularPrice: null, variations: [{ id: 714, options: ['m'], stock, regularPrice: 67000 }] }],
  // Napoli Azurro: PVP $38.000 → WS $19.000 → 15% $16.150
  ['napoli-azurro', { product_id: 2460, stock, regularPrice: null, variations: [{ id: 2461, options: ['m'], stock, regularPrice: 38000 }] }],
  // AEROGREY: PVP $45.000 → WS $22.500 → 10% $20.250
  ['aerogrey', { product_id: 726, stock, regularPrice: null, variations: [{ id: 727, options: ['m'], stock, regularPrice: 45000 }] }],
  // Lamb of God: best seller, fuera de campaña. WS $22.500
  ['lamb-of-god', { product_id: 2107, stock, regularPrice: null, variations: [{ id: 2108, options: ['m'], stock, regularPrice: 45000 }] }],
]);
const line = (slug: string, price: number, quantity = 2) => ({ slug, name: slug, size: 'M', quantity, price });

describe('fixture', () => {
  it('la campaña real valida y tiene los 35 productos en tres grupos', () => {
    expect(PSS).not.toBeNull();
    expect(PSS.items).toHaveLength(35);
    expect(PSS.groups.map(g => g.discount)).toEqual([0.2, 0.15, 0.1]);
    expect(PSS.items.filter(i => i.group === '20')).toHaveLength(8);
    expect(PSS.items.filter(i => i.group === '15')).toHaveLength(6);
    expect(PSS.items.filter(i => i.group === '10')).toHaveLength(21);
  });
});

describe('vigencia y timezone Argentina', () => {
  it('arDate arma los límites del día en Buenos Aires (UTC-3)', () => {
    expect(arDate('2026-10-02', 'end')).toBe('2026-10-02T23:59:59-03:00');
    expect(arDate('2026-09-24')).toBe('2026-09-24T00:00:00-03:00');
    expect(() => arDate('02/10/2026')).toThrow();
  });

  it('"termina el 02.10" es 23:59:59 de Buenos Aires, no de UTC', () => {
    // 02/10 23:30 en AR = 03/10 02:30 UTC: sigue vigente.
    expect(isCampaignLive(PSS, '2026-10-03T02:30:00Z')).toBe(true);
    // 03/10 00:00:01 AR: vencida.
    expect(isCampaignLive(PSS, AFTER)).toBe(false);
    // Arranca 24/09 18:00 AR = 21:00 UTC.
    expect(isCampaignLive(PSS, '2026-09-24T20:59:59Z')).toBe(false);
    expect(isCampaignLive(PSS, '2026-09-24T21:00:00Z')).toBe(true);
  });

  it('campaña futura: scheduled, no aplica', () => {
    expect(effectiveStatus(PSS, BEFORE)).toBe('scheduled');
    expect(campaignDiscountFor([PSS], 713, BEFORE)).toBeNull();
  });

  it('campaña vencida: ended aunque el status persistido siga en active (expiración sin cron)', () => {
    expect(PSS.status).toBe('active');
    expect(effectiveStatus(PSS, AFTER)).toBe('ended');
    expect(campaignDiscountFor([PSS], 713, AFTER)).toBeNull();
    const r = applyCampaign(priceLines([line('find-jesus', 26800)], resolved), [PSS], AFTER);
    expect(r.lines[0].unitPrice).toBe(33500);
    expect(r.lines[0].campaign).toBeNull();
    // El carrito traía el precio promo: se avisa el cambio al precio normal.
    expect(r.changes[0]).toMatchObject({ before: 26800, after: 33500 });
  });

  it('draft y ended persistidos nunca aplican, ni dentro de fechas', () => {
    expect(isCampaignLive({ ...PSS, status: 'draft' }, DURING)).toBe(false);
    expect(isCampaignLive({ ...PSS, status: 'ended' }, DURING)).toBe(false);
  });

  it('el cron solo deja prolijo el estado: marca ended lo vencido y no toca lo vigente', () => {
    const { list, ended } = expireCampaigns([PSS, { ...PSS, id: 'otra', startsAt: '2026-10-05T00:00:00-03:00', endsAt: '2026-10-10T23:59:59-03:00' }], AFTER);
    expect(ended).toEqual([PSS.id]);
    expect(list[0].status).toBe('ended');
    expect(list[0].history.at(-1)).toMatchObject({ from: 'active', to: 'ended', by: 'cron' });
    expect(list[1].status).toBe('active');
  });
});

describe('precios', () => {
  it('precio normal: sin campaña vigente es 50% del PVP, sin cambios', () => {
    const r = applyCampaign(priceLines([line('find-jesus', 33500)], resolved), [], DURING);
    expect(r.lines[0]).toMatchObject({ wsRegular: 33500, unitPrice: 33500, lineTotal: 67000, campaign: null, changed: false });
    expect(r.discountTotal).toBe(0);
    expect(r.campaignIds).toEqual([]);
  });

  it('precio por grupo: 20% / 15% / 10% sobre el mayorista normal', () => {
    expect(campaignPrice(67000, 0.2)).toEqual({ wsRegular: 33500, unitPrice: 26800 });
    expect(campaignPrice(38000, 0.15)).toEqual({ wsRegular: 19000, unitPrice: 16150 });
    expect(campaignPrice(45000, 0.1)).toEqual({ wsRegular: 22500, unitPrice: 20250 });
    const r = applyCampaign(priceLines([line('find-jesus', 26800), line('napoli-azurro', 16150), line('aerogrey', 20250)], resolved), [PSS], DURING);
    expect(r.lines.map(l => [l.unitPrice, l.campaign?.group])).toEqual([[26800, '20'], [16150, '15'], [20250, '10']]);
    expect(r.total).toBe((26800 + 16150 + 20250) * 2);
    expect(r.discountTotal).toBe(((33500 - 26800) + (19000 - 16150) + (22500 - 20250)) * 2);
    expect(r.campaignIds).toEqual([PSS.id]);
    expect(r.changes).toEqual([]);
  });

  it('override por producto pisa al grupo (Find Jesus a 33% → $22.445)', () => {
    const c: WholesaleCampaign = { ...PSS, items: PSS.items.map(i => i.productId === 713 ? { ...i, discount: 0.33 } : i) };
    expect(campaignDiscountFor([c], 713, DURING)).toMatchObject({ discount: 0.33, group: '20' });
    const r = applyCampaign(priceLines([line('find-jesus', 26800)], resolved), [c], DURING);
    expect(r.lines[0].unitPrice).toBe(Math.round(33500 * 0.67));
    expect(r.changes[0]).toMatchObject({ before: 26800, after: 22445 });
  });

  it('producto fuera de campaña: precio normal aunque la campaña esté vigente', () => {
    expect(campaignDiscountFor([PSS], 2107, DURING)).toBeNull();
    const r = applyCampaign(priceLines([line('lamb-of-god', 22500), line('find-jesus', 26800)], resolved), [PSS], DURING);
    expect(r.lines[0]).toMatchObject({ unitPrice: 22500, wsRegular: 22500, campaign: null });
    expect(r.lines[1]).toMatchObject({ unitPrice: 26800, wsRegular: 33500 });
    expect(r.discountTotal).toBe(6700 * 2);
  });

  it('el precio del carrito nunca decide: $1, viejo o mayor → se cobra el de campaña y se marca el cambio', () => {
    for (const bad of [1, 33500, 99000]) {
      const r = applyCampaign(priceLines([line('find-jesus', bad)], resolved), [PSS], DURING);
      expect(r.lines[0].unitPrice).toBe(26800);
      expect(r.changes[0]).toMatchObject({ before: bad, after: 26800 });
    }
  });

  it('dos campañas solapadas: gana el mayor descuento y el admin ve el solapamiento', () => {
    const otra: WholesaleCampaign = { ...PSS, id: 'flash-30', name: 'Flash', groups: [{ key: 'f', label: '30%', discount: 0.3 }], items: [{ productId: 713, group: 'f' }, { productId: 726, group: 'f' }] };
    const menor: WholesaleCampaign = { ...otra, id: 'flash-5', groups: [{ key: 'f', label: '5%', discount: 0.05 }] };
    expect(campaignDiscountFor([PSS, otra], 713, DURING)).toMatchObject({ campaignId: 'flash-30', discount: 0.3 });
    expect(campaignDiscountFor([PSS, menor], 713, DURING)).toMatchObject({ campaignId: PSS.id, discount: 0.2 });
    expect(overlappingProducts([PSS, otra], DURING)).toEqual([{ productId: 713, campaigns: [PSS.id, 'flash-30'] }, { productId: 726, campaigns: [PSS.id, 'flash-30'] }]);
    expect(overlappingProducts([PSS, { ...otra, status: 'draft' }], DURING)).toEqual([]);
  });
});

describe('preview financiero — Private Stock Sale con la foto del 24/09', () => {
  const pv = campaignPreview(PSS, PRODUCTS);

  it('totales: 35 productos, 1.206 unidades, $30.282.500 normal → $26.074.200 promo', () => {
    expect(pv.totals.products).toBe(35);
    expect(pv.totals.units).toBe(EXPECTED.units);
    expect(pv.totals.valueNormal).toBe(EXPECTED.valueNormal);
    expect(pv.totals.valuePromo).toBe(EXPECTED.valuePromo);
    expect(pv.totals.discountTotal).toBe(EXPECTED.discountTotal);
    expect(pv.missing).toEqual([]);
    expect(pv.excluded).toEqual([]);
    expect(pv.unmanaged).toEqual([]);
  });

  it('por grupo', () => {
    expect(pv.byGroup['20']).toMatchObject({ products: 8, units: 300, valuePromo: 7730400 });
    expect(pv.byGroup['15']).toMatchObject({ products: 6, units: 163, valuePromo: 3633750 });
    expect(pv.byGroup['10']).toMatchObject({ products: 21, units: 743, valuePromo: 14710050 });
  });

  it('COGS conocido $6.671.777 (16 productos), margen conocido $5.534.773 (45%), 19 COST_UNKNOWN', () => {
    expect(Math.round(pv.totals.cogsKnown)).toBe(EXPECTED.cogsKnown);
    expect(Math.round(pv.totals.marginKnown)).toBe(EXPECTED.marginKnown);
    expect(pv.totals.productsWithCost).toBe(16);
    expect(pv.costUnknown).toHaveLength(EXPECTED.costUnknown);
    expect(pv.totals.marginKnownPct).toBeCloseTo(0.45, 2);
  });

  it('sin CRITICAL ni RISK en la selección aprobada: se puede activar', () => {
    expect(pv.critical).toEqual([]);
    expect(pv.risk).toEqual([]);
    expect(pv.activationBlockers).toEqual([]);
  });

  it('producto CRITICAL (Sweater 2,82x) bloquea la activación salvo confirmación explícita', () => {
    const conSweater: WholesaleCampaign = { ...PSS, items: [...PSS.items, { productId: 2044, group: '10' }] };
    const p1 = campaignPreview(conSweater, PRODUCTS);
    expect(p1.critical).toEqual([expect.objectContaining({ productId: 2044, accepted: false })]);
    expect(p1.activationBlockers).toEqual([expect.objectContaining({ productId: 2044 })]);
    const aceptado: WholesaleCampaign = { ...PSS, items: [...PSS.items, { productId: 2044, group: '10', acceptCritical: true }] };
    const p2 = campaignPreview(aceptado, PRODUCTS);
    expect(p2.critical[0].accepted).toBe(true);
    expect(p2.activationBlockers).toEqual([]);
    // Con 10% extra, el sweater queda a $40.050 y 21% de margen: el número que el admin tiene que ver.
    expect(p2.rows.find(r => r.productId === 2044)).toMatchObject({ wsRegular: 44500, wsPromo: 40050 });
    expect(p2.rows.find(r => r.productId === 2044)!.marginPromo).toBeCloseTo(0.21, 2);
  });

  it('COST_UNKNOWN no suma al margen conocido pero sí a unidades y valores', () => {
    const aero = pv.rows.find(r => r.productId === 726)!;
    expect(aero).toMatchObject({ risk: 'COST_UNKNOWN', cost: null, marginPromo: null, stock: 105, wsRegular: 22500, wsPromo: 20250, valuePromo: 105 * 20250 });
    expect(pv.costUnknown).toEqual(expect.arrayContaining([{ productId: 726, name: 'AEROGREY - TEEs' }]));
  });

  it('un pack (fuera del mayorista) en items se reporta como excluido y no suma', () => {
    const conPack: WholesaleCampaign = { ...PSS, items: [...PSS.items, { productId: 415, group: '10' }] };
    const p = campaignPreview(conPack, PRODUCTS);
    expect(p.excluded).toEqual([{ productId: 415, name: 'Regular Tees - 3 PACK (Black, Melange, White)' }]);
    expect(p.totals.valuePromo).toBe(EXPECTED.valuePromo);
    expect(campaignPreview({ ...PSS, items: [{ productId: 999999, group: '10' }] }, PRODUCTS).missing).toEqual([999999]);
  });
});

describe('validación y persistencia', () => {
  it('rechaza descuentos fuera de 0-60%, grupos inexistentes, fechas invertidas y productos repetidos', () => {
    const base = fixture.campaign;
    expect(validateCampaign({ ...base, groups: [{ key: 'x', label: 'x', discount: 0.7 }], items: [] }).problems[0].field).toBe('groups');
    expect(validateCampaign({ ...base, items: [{ productId: 713, group: 'nope' }] }).problems[0].field).toBe('items');
    expect(validateCampaign({ ...base, endsAt: '2026-09-01T00:00:00-03:00' }).problems[0].field).toBe('endsAt');
    expect(validateCampaign({ ...base, items: [{ productId: 713, group: '20' }, { productId: 713, group: '10' }] }).problems[0].message).toContain('repetido');
    expect(validateCampaign({ ...base, items: [{ productId: 713, group: '20', discount: 0.61 }] }).problems).toHaveLength(1);
    expect(validateCampaign({ ...base, status: 'paused' }).problems[0].field).toBe('status');
  });

  it('mergeCampaigns: upsert por id, conserva createdAt, registra activación y fin en history', () => {
    const draft = { ...PSS, status: 'draft' as const, createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z' };
    const activated = { ...PSS, status: 'active' as const, updatedAt: '2026-09-24T21:00:00Z' };
    const l1 = mergeCampaigns([draft], [activated]);
    expect(l1).toHaveLength(1);
    expect(l1[0].createdAt).toBe('2026-09-20T00:00:00Z');
    expect(l1[0].activatedAt).toBe('2026-09-24T21:00:00Z');
    expect(l1[0].history.at(-1)).toMatchObject({ from: 'draft', to: 'active' });
    const l2 = mergeCampaigns(l1, [{ ...l1[0], status: 'ended', updatedAt: '2026-10-03T03:00:00Z' }]);
    expect(l2[0].endedAt).toBe('2026-10-03T03:00:00Z');
    expect(mergeCampaigns(l2, [], [PSS.id])).toEqual([]);
  });
});
