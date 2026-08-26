// Única fuente de la lógica financiera del panel. El Dashboard (Inicio) y, más
// adelante, Finanzas y Marketing consumen ESTAS funciones — nunca se recalcula
// un KPI a mano en un componente. Son puras (sin I/O) para poder testearlas
// determinísticamente.
//
// Estado de datos: varios costos todavía no están disponibles (comisiones de
// pasarela, envío absorbido, pauta). No se asumen en cero: se excluyen del
// cálculo y se reportan en `quality` para que la UI marque la métrica como
// estimada y explique qué falta. Un cero es un dato; un faltante es otra cosa.

export interface FinanceLineItem {
  productId: number;
  quantity: number;
  /** Total de la línea ya con descuentos aplicados (WC line_total). */
  lineTotal: number;
}

export interface FinanceOrder {
  id: number;
  /** Total del pedido (WC `total`, ya neto de cupones). */
  total: number;
  /** Monto reembolsado (WC `total_refunded`, positivo). */
  refunded: number;
  lineItems: FinanceLineItem[];
}

/** Devuelve el costo unitario configurado de un producto, o undefined si no tiene. */
export type CostLookup = (productId: number) => number | undefined;

export interface FinanceQuality {
  /** Costos variables que todavía no se pueden calcular con datos reales. */
  missingCostTypes: string[];
  /** Cantidad de productos distintos, dentro del período, sin costo configurado. */
  productsWithoutCost: number;
  /** Unidades vendidas cubiertas por un costo configurado. */
  unitsCovered: number;
  /** Unidades vendidas sin costo configurado (COGS de esas unidades = 0 por falta de dato). */
  unitsMissing: number;
  /** true si contributionProfit es parcial (faltan costos). */
  contributionIsPartial: boolean;
}

export interface FinanceSummary {
  revenue: number;
  orders: number;
  aov: number;
  netRevenue: number;
  cogs: number;
  contributionProfit: number;
  /** contributionProfit / revenue, en 0..1 (o 0 si revenue es 0). */
  profitMargin: number;
  quality: FinanceQuality;
}

// Costos variables que la contribución debería incluir pero hoy no tienen fuente.
// Cuando existan (P1: fees, shipping, ads) se sacan de esta lista y entran al cálculo.
export const MISSING_COST_TYPES = ['comisiones de pasarela', 'envío absorbido', 'inversión publicitaria'];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeRevenue(orders: FinanceOrder[]): number {
  return round2(orders.reduce((s, o) => s + (o.total || 0), 0));
}

export function computeNetRevenue(orders: FinanceOrder[]): number {
  // Revenue ya viene neto de cupones (WC `total`). Net Revenue le resta además
  // los reembolsos. No se descuenta el envío: es plata cobrada al cliente.
  return round2(orders.reduce((s, o) => s + (o.total || 0) - (o.refunded || 0), 0));
}

export function computeAOV(revenue: number, orders: number): number {
  return orders > 0 ? round2(revenue / orders) : 0;
}

export interface CogsResult {
  cogs: number;
  productsWithoutCost: number;
  unitsCovered: number;
  unitsMissing: number;
}

export function computeCOGS(orders: FinanceOrder[], costOf: CostLookup): CogsResult {
  let cogs = 0, unitsCovered = 0, unitsMissing = 0;
  const missingProducts = new Set<number>();
  for (const o of orders) {
    for (const li of o.lineItems) {
      const unit = costOf(li.productId);
      const qty = li.quantity || 0;
      if (unit === undefined || unit === null) {
        unitsMissing += qty;
        if (qty > 0) missingProducts.add(li.productId);
      } else {
        cogs += unit * qty;
        unitsCovered += qty;
      }
    }
  }
  return { cogs: round2(cogs), productsWithoutCost: missingProducts.size, unitsCovered, unitsMissing };
}

export function computeSummary(orders: FinanceOrder[], costOf: CostLookup): FinanceSummary {
  const revenue = computeRevenue(orders);
  const count = orders.length;
  const netRevenue = computeNetRevenue(orders);
  const { cogs, productsWithoutCost, unitsCovered, unitsMissing } = computeCOGS(orders, costOf);

  // Contribution Profit = Net Revenue − COGS − (fees + shipping absorbido + ads).
  // Esos tres últimos todavía no tienen fuente, así que quedan fuera y la métrica
  // se marca parcial. NUNCA se asumen en cero.
  const contributionProfit = round2(netRevenue - cogs);
  const profitMargin = revenue > 0 ? contributionProfit / revenue : 0;

  return {
    revenue,
    orders: count,
    aov: computeAOV(revenue, count),
    netRevenue,
    cogs,
    contributionProfit,
    profitMargin,
    quality: {
      missingCostTypes: MISSING_COST_TYPES,
      productsWithoutCost,
      unitsCovered,
      unitsMissing,
      // Parcial siempre que falte algún costo variable o haya unidades sin costo.
      contributionIsPartial: MISSING_COST_TYPES.length > 0 || unitsMissing > 0,
    },
  };
}

export interface Delta {
  absolute: number;
  /** Variación porcentual en 0..1 (0.15 = +15%). null si el período anterior es 0. */
  pct: number | null;
}

export function delta(current: number, previous: number): Delta {
  const absolute = round2(current - previous);
  const pct = previous !== 0 ? absolute / previous : null;
  return { absolute, pct };
}

export type SummaryComparison = Record<keyof Omit<FinanceSummary, 'quality'>, Delta>;

/** Compara dos resúmenes campo por campo (actual vs período anterior). */
export function compareSummaries(current: FinanceSummary, previous: FinanceSummary): SummaryComparison {
  const keys: (keyof Omit<FinanceSummary, 'quality'>)[] = [
    'revenue', 'orders', 'aov', 'netRevenue', 'cogs', 'contributionProfit', 'profitMargin',
  ];
  const out = {} as SummaryComparison;
  for (const k of keys) out[k] = delta(current[k] as number, previous[k] as number);
  return out;
}
