import { describe, it, expect } from 'vitest';
import { parseInsightRow } from '@/lib/meta/client';
import {
  effectiveAdCost, metaRoas, metaCpa, mer, blendedCac, adSpendPctRevenue,
  breakevenRoas, breakevenSignal, contributionAfterMarketing, camMargin, operatingProfitEstimated,
  type AdvertisingCostRule,
} from '@/lib/meta/metrics';
import { buildAdvertisingSummary, type BusinessInputs } from '@/lib/meta/summary';
import type { MetaInsight } from '@/lib/meta/client';

// Fila real de Insights: MUCHAS variantes de compra con el MISMO valor. Sumarlas
// sobrecontaría ×N. El parser debe elegir omni_purchase (16 / 1.595.423,49).
const REAL_ROW = {
  spend: '828510.38', impressions: '362121', clicks: '7912', ctr: '2.184905', cpc: '104.71', frequency: '2.10',
  actions: [
    { action_type: 'web_in_store_purchase', value: '16' }, { action_type: 'omni_purchase', value: '16' },
    { action_type: 'offsite_conversion.fb_pixel_purchase', value: '16' }, { action_type: 'purchase', value: '16' },
    { action_type: 'omni_add_to_cart', value: '133' },
  ],
  action_values: [
    { action_type: 'omni_purchase', value: '1595423.49' }, { action_type: 'purchase', value: '1595423.49' },
    { action_type: 'omni_add_to_cart', value: '7399250' },
  ],
  purchase_roas: [{ action_type: 'omni_purchase', value: '1.925653' }],
};

describe('parseInsightRow — actions', () => {
  const r = parseInsightRow(REAL_ROW);
  it('elige omni_purchase, NO suma las variantes', () => {
    expect(r.purchases).toBe(16);           // no 16×5
    expect(r.purchaseValue).toBeCloseTo(1595423.49, 2);
  });
  it('spend y métricas base', () => {
    expect(r.spend).toBeCloseTo(828510.38, 2);
    expect(r.impressions).toBe(362121);
  });
  it('ROAS desde purchase_roas reportado', () => {
    expect(r.roas).toBeCloseTo(1.925653, 5);
  });
  it('sin compras → 0, ROAS null', () => {
    const empty = parseInsightRow({ spend: '1000', actions: [], action_values: [], purchase_roas: [] });
    expect(empty.purchases).toBe(0);
    expect(empty.roas).toBeNull();
  });
});

describe('Effective Advertising Cost', () => {
  it('sin reglas: effective = spend, uplift quality MISSING (no se asume 0 exacto)', () => {
    const e = effectiveAdCost(100000, [], '2026-08-27');
    expect(e.effective).toBe(100000);
    expect(e.economicUplift).toBe(0);
    expect(e.upliftQuality).toBe('missing');
    expect(e.spendQuality).toBe('exact');
  });
  it('regla 5% economic → +5%, calidad mixta configured', () => {
    const rule: AdvertisingCostRule = { provider: 'meta', validFrom: '2026-08-01', validTo: null, percent: 0.05, taxTreatment: 'economic_cost', source: 'configured', quality: 'configured' };
    const e = effectiveAdCost(100000, [rule], '2026-08-27');
    expect(e.effective).toBe(105000);
    expect(e.upliftQuality).toBe('configured');
    expect(e.mixed).toBe(true);
  });
  it('regla recoverable NO se suma como costo económico', () => {
    const rule: AdvertisingCostRule = { provider: 'meta', validFrom: '2026-08-01', validTo: null, percent: 0.21, taxTreatment: 'recoverable', source: 'configured', quality: 'configured' };
    expect(effectiveAdCost(100000, [rule], '2026-08-27').effective).toBe(100000);
  });
  it('vigencia histórica: una regla que ya venció no aplica', () => {
    const rule: AdvertisingCostRule = { provider: 'meta', validFrom: '2026-01-01', validTo: '2026-06-30', percent: 0.05, taxTreatment: 'economic_cost', source: 'configured', quality: 'configured' };
    expect(effectiveAdCost(100000, [rule], '2026-08-27').economicUplift).toBe(0);
  });
});

describe('platform / blended definitions', () => {
  it('Meta ROAS = value / spend; 0 spend → null', () => {
    expect(metaRoas(200000, 100000)).toBe(2);
    expect(metaRoas(200000, 0)).toBeNull();
  });
  it('Meta CPA = spend / purchases; 0 purchases → null', () => {
    expect(metaCpa(100000, 20)).toBe(5000);
    expect(metaCpa(100000, 0)).toBeNull();
  });
  it('MER usa Woo revenue (no attributed)', () => {
    expect(mer(1000000, 100000)).toBe(10);
  });
  it('Blended CAC; 0 nuevos → null (no Infinity)', () => {
    expect(blendedCac(100000, 25)).toBe(4000);
    expect(blendedCac(100000, 0)).toBeNull();
  });
  it('Ad Spend % Revenue', () => {
    expect(adSpendPctRevenue(100000, 1000000)).toBeCloseTo(0.1, 6);
  });
});

describe('Breakeven ROAS (derivado del margen pre-ad)', () => {
  it('margen 67% → breakeven 1/0,67 ≈ 1,49', () => {
    const be = breakevenRoas(670000, 1000000);
    expect(be).toBeCloseTo(1 / 0.67, 4);
  });
  it('señal: above / near / below según thresholds derivados', () => {
    const be = 1.5;
    expect(breakevenSignal(1.8, be)).toBe('above');   // >= 1.65
    expect(breakevenSignal(1.5, be)).toBe('near');     // dentro de ±10%
    expect(breakevenSignal(1.0, be)).toBe('below');
    expect(breakevenSignal(null, be)).toBe('unknown');
  });
});

describe('capas financieras', () => {
  it('Contribution After Marketing = Contribution − Effective Ad Cost', () => {
    expect(contributionAfterMarketing(8000000, 1000000)).toBe(7000000);
    expect(camMargin(7000000, 12000000)).toBeCloseTo(7 / 12, 6);
  });
  it('Operating Profit Estimated = CAM − OpEx (no es Net Profit)', () => {
    expect(operatingProfitEstimated(7000000, 100000)).toBe(6900000);
  });
  it('se computa con valores RAW; el redondeo es sólo de display (el "$1")', () => {
    // Raw: 5.487.251,6 − 100.240,4 = 5.387.011,2 → display 5.387.011.
    // Si se restara el display-de-cada-capa (5.487.252 − 100.240) daría 5.387.012.
    const cam = 5_487_251.6, opEx = 100_240.4;
    expect(operatingProfitEstimated(cam, opEx)).toBeCloseTo(5_387_011.2, 2);
    expect(Math.round(cam) - Math.round(opEx)).toBe(5_387_012); // el error acumulado que EVITAMOS
    expect(Math.round(operatingProfitEstimated(cam, opEx))).toBe(5_387_011); // el correcto
  });
});

describe('buildAdvertisingSummary — integración', () => {
  const campaigns: MetaInsight[] = [
    { id: 'c1', campaignId: 'c1', name: 'Cold', spend: 500000, impressions: 100000, reach: 50000, clicks: 4000, cpm: 5000, ctr: 4, cpc: 125, frequency: 2, purchases: 10, purchaseValue: 1200000, roas: 2.4 },
    { id: 'c2', campaignId: 'c2', name: 'Rmkt', spend: 300000, impressions: 40000, reach: 20000, clicks: 2000, cpm: 7500, ctr: 5, cpc: 150, frequency: 2, purchases: 6, purchaseValue: 300000, roas: 1.0 },
  ];
  const biz: BusinessInputs = { wooRevenue: 12000000, netRevenue: 12000000, contributionProfit: 8000000, newCustomers: 40, operatingExpenses: 100000, operatingExpensesPartial: true };
  const s = buildAdvertisingSummary(
    { name: 'HYPESTYLE', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' },
    null, campaigns, new Map([['c1', 'ACTIVE'], ['c2', 'PAUSED']]), biz, [], '2026-08-27',
  );

  it('platform: spend y attributed suman las campañas cuando no hay accountRow', () => {
    expect(s.platform.spend).toBe(800000);
    expect(s.platform.attributedValue).toBe(1500000);
    expect(s.platform.roas).toBeCloseTo(1500000 / 800000, 5);
  });
  it('business: MER usa Woo (12M / 800k = 15), no attributed', () => {
    expect(s.business.mer).toBeCloseTo(15, 4);
  });
  it('CAM = 8M − 800k; Operating Profit = CAM − 100k; marcado partial', () => {
    expect(s.business.contributionAfterMarketing).toBe(7200000);
    expect(s.business.operatingProfitEstimated).toBe(7100000);
    expect(s.business.operatingProfitPartial).toBe(true);
  });
  it('breakeven ≈ 1,5; campaña Cold (2,4) above, Rmkt (1,0) below', () => {
    expect(s.business.breakevenRoas).toBeCloseTo(1.5, 4);
    const cold = s.campaigns.find((c) => c.id === 'c1')!;
    const rmkt = s.campaigns.find((c) => c.id === 'c2')!;
    expect(cold.signal).toBe('above');
    expect(rmkt.signal).toBe('below');
    expect(cold.status).toBe('ACTIVE');
  });
  it('Blended CAC = 800k / 40 = 20.000', () => {
    expect(s.business.blendedCac).toBe(20000);
  });
});
