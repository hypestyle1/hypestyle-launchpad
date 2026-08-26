import { describe, it, expect } from 'vitest';
import {
  computeRevenue, computeNetRevenue, computeAOV, computeCOGS, computeSummary,
  delta, compareSummaries, type FinanceOrder, type CostLookup,
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
