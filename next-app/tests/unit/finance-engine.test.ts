import { describe, it, expect } from 'vitest';
import { providerOf, groupOf, ruleFor, computeOrderFee, aggregateByGateway, feeCoverage } from '@/lib/finance/fees';
import { computeShipping } from '@/lib/finance/shipping';
import { computeVariableCosts } from '@/lib/finance/variable-costs';
import { computeOrderProfit, aggregateFinance, type OrderInput } from '@/lib/finance/calculations';
import { DEFAULT_FINANCE_CONFIG, mergeFinanceConfig } from '@/lib/finance/config';
import type { FeeRule, GatewayFeeSnapshot, FinanceConfig } from '@/lib/finance/types';

const costOf = (id: number) => ({ 10: 1000, 20: 500 } as Record<number, number>)[id];

describe('fees — mapeo de proveedor', () => {
  it('mapea payment_method de Woo a proveedor', () => {
    expect(providerOf('talo-pay-cvu-woo')).toBe('talo');
    expect(providerOf('tarjeta')).toBe('mercadopago_card');
    expect(providerOf('mercadopago')).toBe('mercadopago_wallet');
    expect(providerOf('gocuotas')).toBe('gocuotas');
    expect(providerOf('desconocido')).toBe('other');
  });
  it('agrupa tarjeta y wallet bajo mercadopago', () => {
    expect(groupOf('mercadopago_card')).toBe('mercadopago');
    expect(groupOf('mercadopago_wallet')).toBe('mercadopago');
    expect(groupOf('talo')).toBe('talo');
  });
});

describe('fees — reglas con vigencia temporal', () => {
  const rules: FeeRule[] = [
    { id: 'a', provider: 'mercadopago_card', percent: 0.0399, fixed: 0, from: '2026-01-01', to: '2026-06-01' },
    { id: 'b', provider: 'mercadopago_card', percent: 0.0499, fixed: 0, from: '2026-06-01', to: null },
  ];
  it('elige la regla vigente según la fecha (no reescribe el pasado)', () => {
    expect(ruleFor(rules, 'mercadopago_card', '2026-03-15')!.id).toBe('a');
    expect(ruleFor(rules, 'mercadopago_card', '2026-08-15')!.id).toBe('b');
  });
  it('devuelve null si no hay regla para el proveedor/fecha', () => {
    expect(ruleFor(rules, 'talo', '2026-08-15')).toBeNull();
  });
});

describe('fees — jerarquía exact → configured → missing', () => {
  const rules = DEFAULT_FINANCE_CONFIG.feeRules;

  it('configured: aplica % + fijo sobre el bruto', () => {
    const f = computeOrderFee({ paymentMethod: 'tarjeta', gross: 100000, dateISO: '2026-08-10' }, rules);
    expect(f.source).toBe('configured');
    expect(f.economicCost).toBe(4990);       // 4,99%
    expect(f.netReceived).toBe(95010);
  });

  it('exact: usa el snapshot y separa retenciones como cash deduction', () => {
    const snapshot: GatewayFeeSnapshot = {
      provider: 'mercadopago_card', transactionId: 'x', grossAmount: 100000,
      gatewayFee: 5120, netReceived: 91000, otherCashDeduction: 3880,
      breakdown: [{ type: 'mercadopago_fee', amount: 5120 }], currency: 'ARS',
      syncedAt: '2026-08-10', source: 'exact',
    };
    const f = computeOrderFee({ paymentMethod: 'tarjeta', gross: 100000, dateISO: '2026-08-10', snapshot }, rules);
    expect(f.source).toBe('exact');
    expect(f.economicCost).toBe(5120);        // sólo el costo económico afecta profit
    expect(f.netReceived).toBe(91000);        // neto de caja
    expect(f.otherCashDeduction).toBe(3880);  // retención: caja, no profit
  });

  it('missing: sin regla ni snapshot → source missing, NO asume un costo inventado', () => {
    const f = computeOrderFee({ paymentMethod: 'nuevo-metodo', gross: 100000, dateISO: '2026-08-10' }, []);
    expect(f.source).toBe('missing');
  });

  it('talo configurado 0% queda configured, no missing', () => {
    const f = computeOrderFee({ paymentMethod: 'talo-pay-cvu-woo', gross: 50000, dateISO: '2026-08-10' }, rules);
    expect(f.source).toBe('configured');
    expect(f.economicCost).toBe(0);
  });
});

describe('fees — agregación por pasarela y effective fee rate', () => {
  const rules = DEFAULT_FINANCE_CONFIG.feeRules;
  it('effective fee rate = economic cost / gross, y coverage por monto', () => {
    const rows = [
      { gross: 100000, fee: computeOrderFee({ paymentMethod: 'tarjeta', gross: 100000, dateISO: '2026-08-10' }, rules) },
      { gross: 50000, fee: computeOrderFee({ paymentMethod: 'tarjeta', gross: 50000, dateISO: '2026-08-10' }, rules) },
    ];
    const agg = aggregateByGateway(rows);
    const mp = agg.find((a) => a.group === 'mercadopago')!;
    expect(mp.grossCollected).toBe(150000);
    expect(mp.economicCost).toBe(7485);       // 4,99% de 150k
    expect(mp.effectiveFeeRate).toBeCloseTo(0.0499, 4);
    expect(mp.coverage).toBe(1);              // todo configured
  });
  it('feeCoverage ponderada baja cuando hay missing', () => {
    const rows = [
      { gross: 80000, fee: computeOrderFee({ paymentMethod: 'tarjeta', gross: 80000, dateISO: '2026-08-10' }, rules) },
      { gross: 20000, fee: computeOrderFee({ paymentMethod: 'raro', gross: 20000, dateISO: '2026-08-10' }, []) },
    ];
    expect(feeCoverage(rows)).toBeCloseTo(0.8, 4);
  });
});

describe('shipping — cobrado vs real, sin clamp a cero', () => {
  it('sin real cost configurado → missing, no asume cero', () => {
    const s = computeShipping(6500, null);
    expect(s.charged).toBe(6500);
    expect(s.realCost).toBeNull();
    expect(s.realSource).toBe('missing');
  });
  it('diferencia negativa (Hype gana) no se clampea en difference', () => {
    const s = computeShipping(10000, 8500);
    expect(s.difference).toBe(-1500);   // real < cobrado
    expect(s.absorbed).toBe(0);         // no absorbe (ganó)
  });
  it('Hype absorbe cuando el real supera lo cobrado', () => {
    const s = computeShipping(6500, 9200);
    expect(s.difference).toBe(2700);
    expect(s.absorbed).toBe(2700);
  });
});

describe('variable costs — per_order / per_unit / percent', () => {
  it('suma los tres tipos', () => {
    const r = computeVariableCosts(
      [
        { id: '1', label: 'Packaging', type: 'per_order', value: 700 },
        { id: '2', label: 'Bolsa', type: 'per_unit', value: 120 },
        { id: '3', label: 'Operativo', type: 'percent', value: 0.005 },
      ],
      { units: 3, revenue: 100000 }
    );
    expect(r.total).toBe(700 + 360 + 500);  // 700 + 120*3 + 0,5% de 100k
    expect(r.source).toBe('configured');
  });
  it('sin costos configurados → missing (no cero silencioso)', () => {
    expect(computeVariableCosts([], { units: 2, revenue: 1000 }).source).toBe('missing');
  });
});

describe('engine — cascada por pedido', () => {
  const cfg: FinanceConfig = mergeFinanceConfig({
    feeRules: DEFAULT_FINANCE_CONFIG.feeRules,
    variableCosts: [{ id: '1', label: 'Packaging', type: 'per_order', value: 700 }],
    shipping: { flatRealCost: 9000 },
  });
  const order: OrderInput = {
    id: 1, number: '1', dateISO: '2026-08-10', paymentMethod: 'tarjeta',
    total: 100000, refunded: 0, shippingCharged: 6000,
    lineItems: [{ productId: 10, quantity: 2, lineTotal: 80000 }, { productId: 20, quantity: 1, lineTotal: 20000 }],
  };
  it('calcula Revenue → Contribution Profit correctamente', () => {
    const p = computeOrderProfit(order, costOf, cfg);
    expect(p.netRevenue).toBe(100000);
    expect(p.cogs).toBe(2500);              // 1000*2 + 500*1
    expect(p.grossProfit).toBe(97500);
    expect(p.fee.economicCost).toBe(4990);  // 4,99%
    expect(p.shipping.absorbed).toBe(3000); // 9000 real − 6000 cobrado
    expect(p.variableCosts.total).toBe(700);
    // 97500 − 4990 − 3000 − 700
    expect(p.contributionProfit).toBe(88810);
    expect(p.complete).toBe(true);
  });
  it('refund parcial baja Net Revenue', () => {
    const p = computeOrderProfit({ ...order, refunded: 20000 }, costOf, cfg);
    expect(p.netRevenue).toBe(80000);
  });
  it('producto sin costo → cogsSource missing y no completo', () => {
    const p = computeOrderProfit({ ...order, lineItems: [{ productId: 99, quantity: 1, lineTotal: 100000 }] }, costOf, cfg);
    expect(p.cogsSource).toBe('missing');
    expect(p.complete).toBe(false);
  });
  it('profit negativo posible (no se oculta)', () => {
    const p = computeOrderProfit(
      { ...order, total: 3000, lineItems: [{ productId: 10, quantity: 5, lineTotal: 3000 }] },
      costOf, cfg
    );
    expect(p.contributionProfit).toBeLessThan(0); // COGS 5000 > revenue 3000
  });
});

describe('engine — agregado del período', () => {
  const cfg = DEFAULT_FINANCE_CONFIG;
  it('suma y calcula márgenes y coverage', () => {
    const orders: OrderInput[] = [
      { id: 1, number: '1', dateISO: '2026-08-10', paymentMethod: 'tarjeta', total: 100000, refunded: 0, shippingCharged: 0, lineItems: [{ productId: 10, quantity: 1, lineTotal: 100000 }] },
      { id: 2, number: '2', dateISO: '2026-08-11', paymentMethod: 'talo-pay-cvu-woo', total: 50000, refunded: 0, shippingCharged: 0, lineItems: [{ productId: 99, quantity: 1, lineTotal: 50000 }] },
    ];
    const s = aggregateFinance(orders.map((o) => computeOrderProfit(o, costOf, cfg)));
    expect(s.revenue).toBe(150000);
    expect(s.netRevenue).toBe(150000);
    expect(s.cogs).toBe(1000);              // sólo el pedido 1 (producto 10)
    expect(s.paymentFees).toBe(4990);       // 4,99% de 100k (talo 0%)
    // cobertura de COGS ponderada por netRevenue: 100k conocido / 150k total
    expect(s.coverage.cogs).toBeCloseTo(100000 / 150000, 4);
    expect(s.coverage.fees).toBe(1);        // ambos tienen fee (uno 0% configurado)
  });
});
