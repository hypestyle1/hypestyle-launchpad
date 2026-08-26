import { describe, it, expect } from 'vitest';
import {
  computeRevenue, computeNetRevenue, computeAOV, computeCOGS, computeSummary,
  delta, compareSummaries, costCoverage, computeTopProducts, classifyCustomers,
  type FinanceOrder, type CostLookup, type CustomerOrder,
} from '@/lib/dashboard/finance';

// Costos: producto 10 = $1000/u, producto 20 = $500/u, producto 99 = sin costo.
const costOf: CostLookup = (id) => ({ 10: 1000, 20: 500 } as Record<number, number>)[id];

const order = (total: number, items: [number, number, number][], refunded = 0): FinanceOrder => ({
  id: Math.round(total),
  total,
  refunded,
  lineItems: items.map(([productId, quantity, lineTotal]) => ({ productId, quantity, lineTotal })),
});

describe('finance — KPIs básicos', () => {
  it('Revenue suma los totales', () => {
    expect(computeRevenue([order(1000, []), order(2500, [])])).toBe(3500);
    expect(computeRevenue([])).toBe(0);
  });

  it('Net Revenue resta reembolsos, no el envío', () => {
    expect(computeNetRevenue([order(1000, [], 200), order(500, [], 0)])).toBe(1300);
  });

  it('AOV = Revenue / Orders, y 0 sin pedidos', () => {
    expect(computeAOV(3000, 2)).toBe(1500);
    expect(computeAOV(0, 0)).toBe(0);
  });
});

describe('finance — COGS y calidad de dato', () => {
  it('suma costo unitario × cantidad sólo de productos con costo', () => {
    const r = computeCOGS([order(5000, [[10, 2, 4000], [20, 1, 1000]])], costOf);
    expect(r.cogs).toBe(2500);          // 1000*2 + 500*1
    expect(r.unitsCovered).toBe(3);
    expect(r.unitsMissing).toBe(0);
    expect(r.productsWithoutCost).toBe(0);
  });

  it('un producto sin costo NO se asume en cero: se cuenta como faltante', () => {
    const r = computeCOGS([order(3000, [[10, 1, 2000], [99, 2, 1000]])], costOf);
    expect(r.cogs).toBe(1000);          // sólo el producto 10
    expect(r.unitsCovered).toBe(1);
    expect(r.unitsMissing).toBe(2);
    expect(r.productsWithoutCost).toBe(1);
  });
});

describe('finance — resumen completo', () => {
  it('Contribution Profit = Net Revenue − COGS, marcado parcial', () => {
    const s = computeSummary(
      [order(5000, [[10, 2, 4000], [20, 1, 1000]], 0)],
      costOf
    );
    expect(s.revenue).toBe(5000);
    expect(s.orders).toBe(1);
    expect(s.aov).toBe(5000);
    expect(s.netRevenue).toBe(5000);
    expect(s.cogs).toBe(2500);
    expect(s.contributionProfit).toBe(2500);
    expect(s.profitMargin).toBeCloseTo(0.5, 5);
    // Siempre parcial mientras falten fees/shipping/ads.
    expect(s.quality.contributionIsPartial).toBe(true);
    expect(s.quality.missingCostTypes.length).toBeGreaterThan(0);
  });

  it('resumen vacío es todo cero (no NaN)', () => {
    const s = computeSummary([], costOf);
    expect(s.revenue).toBe(0);
    expect(s.aov).toBe(0);
    expect(s.profitMargin).toBe(0);
    expect(Number.isNaN(s.contributionProfit)).toBe(false);
  });
});

describe('finance — cost coverage ponderada por revenue', () => {
  it('mide revenue con costo conocido / revenue total, no productos', () => {
    // producto 10 (con costo) factura 9000; producto 99 (sin costo) factura 1000.
    const r = computeCOGS([order(10000, [[10, 3, 9000], [99, 1, 1000]])], costOf);
    expect(r.revenueCovered).toBe(9000);
    expect(r.revenueTotal).toBe(10000);
    expect(costCoverage(r)).toBeCloseTo(0.9, 5); // 90% del revenue tiene costo
  });

  it('cobertura 0 si no hay líneas', () => {
    expect(costCoverage(computeCOGS([], costOf))).toBe(0);
  });
});

describe('finance — top products', () => {
  it('rankea por revenue y deja contribution en null si falta costo', () => {
    const orders = [
      order(3000, [[10, 1, 2000], [99, 1, 1000]]),
      order(2000, [[10, 1, 2000]]),
    ];
    const top = computeTopProducts(orders, costOf, 5);
    expect(top[0].productId).toBe(10);
    expect(top[0].units).toBe(2);
    expect(top[0].revenue).toBe(4000);
    expect(top[0].contribution).toBe(2000); // 4000 − 1000*2
    const p99 = top.find((t) => t.productId === 99)!;
    expect(p99.contribution).toBeNull(); // sin costo → no se inventa
  });
});

describe('finance — nuevos vs recurrentes', () => {
  const co = (key: string, iso: string, total: number): CustomerOrder => ({ customerKey: key, ms: Date.parse(iso), total });
  const START = Date.parse('2026-08-01T00:00:00Z');
  const END = Date.parse('2026-09-01T00:00:00Z');

  it('nuevo = primer pedido dentro del período; recurrente = compró antes', () => {
    const hist = [
      co('ana', '2026-06-10T00:00:00Z', 1000),  // antes del período
      co('ana', '2026-08-05T00:00:00Z', 2000),  // en período → recurrente
      co('leo', '2026-08-10T00:00:00Z', 3000),  // primer pedido en período → nuevo
    ];
    const s = classifyCustomers(hist, START, END);
    expect(s.newCount).toBe(1);          // leo
    expect(s.recurringCount).toBe(1);    // ana
    expect(s.revenueNew).toBe(3000);
    expect(s.revenueRecurring).toBe(2000);
    expect(s.recurringPct).toBeCloseTo(0.5, 5);
  });

  it('sin pedidos en el período → todo cero', () => {
    const s = classifyCustomers([co('ana', '2026-06-10T00:00:00Z', 1000)], START, END);
    expect(s.newCount).toBe(0);
    expect(s.recurringCount).toBe(0);
    expect(s.recurringPct).toBe(0);
  });
});

describe('finance — comparación de períodos', () => {
  it('delta absoluto y porcentual', () => {
    expect(delta(150, 100)).toEqual({ absolute: 50, pct: 0.5 });
    expect(delta(80, 100)).toEqual({ absolute: -20, pct: -0.2 });
  });

  it('pct es null cuando el período anterior es 0 (evita dividir por cero)', () => {
    expect(delta(100, 0)).toEqual({ absolute: 100, pct: null });
  });

  it('compara todos los campos', () => {
    const cur = computeSummary([order(2000, [[10, 1, 2000]])], costOf);
    const prev = computeSummary([order(1000, [[10, 1, 1000]])], costOf);
    const cmp = compareSummaries(cur, prev);
    expect(cmp.revenue.absolute).toBe(1000);
    expect(cmp.revenue.pct).toBeCloseTo(1, 5); // +100%
    expect(cmp.orders.absolute).toBe(0);
  });
});
