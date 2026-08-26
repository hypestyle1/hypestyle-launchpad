import type { VariableCost, DataSource } from './types';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface VariableCostResult {
  total: number;
  /** Desglose por costo configurado. */
  items: { label: string; amount: number }[];
  /** 'configured' si hay costos definidos; 'missing' si no hay ninguno configurado. */
  source: DataSource;
}

/** Costos variables de un pedido según la config (per_order / per_unit / percent). */
export function computeVariableCosts(
  costs: VariableCost[],
  ctx: { units: number; revenue: number }
): VariableCostResult {
  if (!costs.length) return { total: 0, items: [], source: 'missing' };
  const items = costs.map((c) => {
    let amount = 0;
    if (c.type === 'per_order') amount = c.value;
    else if (c.type === 'per_unit') amount = c.value * ctx.units;
    else if (c.type === 'percent') amount = c.value * ctx.revenue;
    return { label: c.label, amount: round2(amount) };
  });
  return { total: round2(items.reduce((s, i) => s + i.amount, 0)), items, source: 'configured' };
}
