import { describe, it, expect } from 'vitest';
import { computeOrderFee } from '@/lib/finance/fees';
import { computeOrderProfit, aggregateFinance, type OrderInput } from '@/lib/finance/calculations';
import { accreditationMs } from '@/lib/finance/fetch-orders';
import { mpActivityUrl } from '@/lib/finance/mp-links';
import { DEFAULT_FINANCE_CONFIG } from '@/lib/finance/config';
import type { GatewayFeeSnapshot, GatewayFeeSnapshotV2 } from '@/lib/finance/types';

// Fase 2 — ingreso neto real: desglose por concepto, retenciones como costo,
// base por acreditación y link a MP.

const costOf = (id: number) => ({ 10: 1000 } as Record<number, number>)[id];
const cfg = DEFAULT_FINANCE_CONFIG;

/** Snapshot v2 real del #3147 (redondeado): 3 cuotas + SIRTAC 3%. */
function v2(over: Partial<GatewayFeeSnapshotV2> = {}): GatewayFeeSnapshotV2 {
  return {
    provider: 'mercadopago_card', transactionId: '177835956882', grossAmount: 95108.56,
    gatewayFee: 19309.79, netReceived: 72945.51, breakdown: [], otherCashDeduction: 2853.26,
    currency: 'ARS', syncedAt: '2026-09-10T15:00:00.000Z', source: 'exact',
    version: 2, paymentId: '177835956882', externalReference: '3147', merchantOrderId: null, collectorId: null,
    paymentMethodId: 'visa', paymentTypeId: 'credit_card', installments: 3, status: 'approved', statusDetail: 'accredited',
    gross: 95108.56, totalPaid: 95108.56, feeGateway: 7237.76, feeFinancing: 12072.03, feeOther: 0,
    taxWithholdings: [{ name: 'tax_withholding_sirtac_noinsc-buenos_aires', regime: 'sirtac_noinsc', jurisdiction: 'buenos_aires', amount: 2853.26, sourceId: null }],
    taxWithholdingTotal: 2853.26, refunded: 0, adjustments: 0, netCashReceived: 72945.51, calculatedNet: 72945.51,
    discrepancy: null, charges: [],
    dateCreated: '2026-09-09T10:00:00.000-04:00', dateApproved: '2026-09-09T10:00:05.000-04:00',
    moneyReleaseDate: '2026-09-09T10:00:05.000-04:00', moneyReleaseStatus: 'released',
    quality: 'real', warnings: [],
    ...over,
  };
}

const v1: GatewayFeeSnapshot = {
  provider: 'mercadopago_card', transactionId: 'old', grossAmount: 100000,
  gatewayFee: 5000, netReceived: 92000, otherCashDeduction: 3000,
  breakdown: [{ type: 'mercadopago_fee', amount: 5000 }], currency: 'ARS', syncedAt: '2026-08-01', source: 'exact',
};

const order = (over: Partial<OrderInput> = {}): OrderInput => ({
  id: 3147, number: '3147', dateISO: '2026-09-09T13:00:00.000Z', paymentMethod: 'tarjeta',
  total: 95108.56, refunded: 0, shippingCharged: 0,
  lineItems: [{ productId: 10, quantity: 1, lineTotal: 95108.56 }],
  snapshot: v2(),
  ...over,
});

describe('computeOrderFee — desglose por concepto', () => {
  it('v2: separa comisión, financiación y retención, y expone cuotas y acreditación', () => {
    const f = computeOrderFee({ paymentMethod: 'tarjeta', gross: 95108.56, dateISO: '2026-09-09', snapshot: v2() }, cfg.feeRules);
    expect(f.source).toBe('exact');
    expect(f.breakdown).toEqual({ gateway: 7237.76, financing: 12072.03, other: 0, taxWithholdings: 2853.26 });
    expect(f.economicCost).toBe(19309.79);
    expect(f.installments).toBe(3);
    expect(f.moneyReleaseDate).toBe('2026-09-09T10:00:05.000-04:00');
  });

  it('v1: todo el fee va a comisión y la retención sale de otherCashDeduction', () => {
    const f = computeOrderFee({ paymentMethod: 'tarjeta', gross: 100000, dateISO: '2026-08-01', snapshot: v1 }, cfg.feeRules);
    expect(f.breakdown).toEqual({ gateway: 5000, financing: 0, other: 0, taxWithholdings: 3000 });
    expect(f.installments).toBeNull();
  });

  it('configurado: el estimado va a comisión, sin financiación ni retención', () => {
    const f = computeOrderFee({ paymentMethod: 'tarjeta', gross: 100000, dateISO: '2026-08-01' }, cfg.feeRules);
    expect(f.source).toBe('configured');
    expect(f.breakdown).toEqual({ gateway: 4990, financing: 0, other: 0, taxWithholdings: 0 });
  });

  it('missing: desglose en cero y sin fechas', () => {
    const f = computeOrderFee({ paymentMethod: 'desconocido', gross: 100000, dateISO: '2026-08-01' }, []);
    expect(f.source).toBe('missing');
    expect(f.breakdown).toEqual({ gateway: 0, financing: 0, other: 0, taxWithholdings: 0 });
  });
});

describe('computeOrderProfit — la retención es costo', () => {
  it('resta la retención del Contribution Profit además de la comisión', () => {
    const p = computeOrderProfit(order(), costOf, cfg);
    // grossProfit = 95108.56 − 1000; − fees 19309.79 − IIBB 2853.26 (sin shipping ni variable)
    expect(p.taxWithholdings).toBe(2853.26);
    expect(p.contributionProfit).toBe(Math.round((95108.56 - 1000 - 19309.79 - 2853.26) * 100) / 100);
    expect(p.netCollected).toBe(72945.51);
  });

  it('sin retención, el Contribution Profit no cambia respecto del cálculo anterior', () => {
    const p = computeOrderProfit(order({ snapshot: v2({ taxWithholdingTotal: 0, taxWithholdings: [], otherCashDeduction: 0, netReceived: 75798.77, netCashReceived: 75798.77 }) }), costOf, cfg);
    expect(p.taxWithholdings).toBe(0);
    expect(p.contributionProfit).toBe(Math.round((95108.56 - 1000 - 19309.79) * 100) / 100);
  });

  it('propaga la fecha de acreditación', () => {
    const p = computeOrderProfit(order({ accreditedISO: '2026-09-09T14:00:05.000Z' }), costOf, cfg);
    expect(p.accreditedISO).toBe('2026-09-09T14:00:05.000Z');
  });
});

describe('aggregateFinance — deducciones del período e ingreso neto real', () => {
  it('suma por concepto y reparte exacto vs estimado', () => {
    const profits = [
      computeOrderProfit(order(), costOf, cfg),                                    // exacto v2
      computeOrderProfit(order({ id: 2, total: 100000, lineItems: [{ productId: 10, quantity: 1, lineTotal: 100000 }], snapshot: null }), costOf, cfg), // estimado 4,99%
    ];
    const s = aggregateFinance(profits);
    expect(s.deductions.gateway).toBe(Math.round((7237.76 + 4990) * 100) / 100);
    expect(s.deductions.financing).toBe(12072.03);
    expect(s.deductions.taxWithholdings).toBe(2853.26);
    expect(s.taxWithholdings).toBe(2853.26);
    expect(s.deductions.exact).toBe(Math.round((7237.76 + 12072.03 + 2853.26) * 100) / 100);
    expect(s.deductions.estimated).toBe(4990);
    expect(s.deductions.unknownGross).toBe(0);
    // Ingreso neto real = neto MP + (100000 − 4990)
    expect(s.netIncome).toBe(Math.round((72945.51 + 95010) * 100) / 100);
    expect(s.netIncomeRate).toBeCloseTo(s.netIncome / s.revenue, 6);
  });

  it('un reembolso de Woo en un pedido sin snapshot baja el ingreso neto; con snapshot ya viene descontado', () => {
    const conSnap = computeOrderProfit(order({ refunded: 10000 }), costOf, cfg);
    const sinSnap = computeOrderProfit(order({ id: 2, snapshot: null, refunded: 10000 }), costOf, cfg);
    expect(aggregateFinance([conSnap]).netIncome).toBe(72945.51);
    const feeEstimado = Math.round(95108.56 * 0.0499 * 100) / 100;
    expect(aggregateFinance([sinSnap]).netIncome).toBe(Math.round((95108.56 - feeEstimado - 10000) * 100) / 100);
    expect(aggregateFinance([conSnap, sinSnap]).deductions.refunds).toBe(20000);
  });

  it('pedidos sin dato ni regla quedan como bruto desconocido, no como deducción cero', () => {
    const s = aggregateFinance([computeOrderProfit(order({ paymentMethod: 'raro', snapshot: null }), costOf, { ...cfg, feeRules: [] })]);
    expect(s.deductions.unknownGross).toBe(95108.56);
    expect(s.deductions.total).toBe(0);
  });
});

describe('accreditationMs — base por acreditación', () => {
  it('usa la fecha de liberación del snapshot v2 si existe', () => {
    const ms = accreditationMs({ date_paid_gmt: '2026-09-01T00:00:00', date_created_gmt: '2026-08-31T00:00:00' }, v2({ moneyReleaseDate: '2026-09-20T10:00:00.000-04:00' }));
    expect(new Date(ms).toISOString()).toBe('2026-09-20T14:00:00.000Z');
  });
  it('sin snapshot cae a la fecha de pago, y sin pago a la de creación', () => {
    expect(new Date(accreditationMs({ date_paid_gmt: '2026-09-01T03:00:00', date_created_gmt: '2026-08-31T00:00:00' }, null)).toISOString()).toBe('2026-09-01T03:00:00.000Z');
    expect(new Date(accreditationMs({ date_paid_gmt: null, date_created_gmt: '2026-08-31T00:00:00' }, null)).toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });
  it('v1 no tiene fecha de liberación: cae al pago', () => {
    expect(new Date(accreditationMs({ date_paid_gmt: '2026-09-01T03:00:00', date_created_gmt: null }, v1)).toISOString()).toBe('2026-09-01T03:00:00.000Z');
  });
  it('nada parseable → NaN (el pedido queda fuera del rango, no en una fecha inventada)', () => {
    expect(Number.isNaN(accreditationMs({ date_paid_gmt: null, date_created_gmt: null }, null))).toBe(true);
  });
});

describe('mpActivityUrl', () => {
  it('busca el pago en Actividad del panel de MP', () => {
    expect(mpActivityUrl('177835956882')).toBe('https://www.mercadopago.com.ar/activities?q=177835956882');
  });
});
