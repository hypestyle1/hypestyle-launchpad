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
  /** Nombre del producto (para rankings). Opcional. */
  name?: string;
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
  /** Cobertura de costos ponderada por revenue, en 0..1. */
  costCoverage: number;
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
  /** Revenue (line_total) de líneas CON costo conocido. */
  revenueCovered: number;
  /** Revenue (line_total) de TODAS las líneas del período. */
  revenueTotal: number;
}

export function computeCOGS(orders: FinanceOrder[], costOf: CostLookup): CogsResult {
  let cogs = 0, unitsCovered = 0, unitsMissing = 0, revenueCovered = 0, revenueTotal = 0;
  const missingProducts = new Set<number>();
  for (const o of orders) {
    for (const li of o.lineItems) {
      const unit = costOf(li.productId);
      const qty = li.quantity || 0;
      const lineTotal = li.lineTotal || 0;
      revenueTotal += lineTotal;
      if (unit === undefined || unit === null) {
        unitsMissing += qty;
        if (qty > 0) missingProducts.add(li.productId);
      } else {
        cogs += unit * qty;
        unitsCovered += qty;
        revenueCovered += lineTotal;
      }
    }
  }
  return {
    cogs: round2(cogs),
    productsWithoutCost: missingProducts.size,
    unitsCovered, unitsMissing,
    revenueCovered: round2(revenueCovered),
    revenueTotal: round2(revenueTotal),
  };
}

/**
 * Cobertura de costos PONDERADA POR REVENUE: qué porción de la facturación tiene
 * costo de producto conocido. Es más honesto que "productos con costo / total":
 * un catálogo con muchos productos sin costo pero que casi no se venden igual
 * puede tener alta cobertura de revenue.
 */
export function costCoverage(cogs: CogsResult): number {
  return cogs.revenueTotal > 0 ? cogs.revenueCovered / cogs.revenueTotal : 0;
}

export function computeSummary(orders: FinanceOrder[], costOf: CostLookup): FinanceSummary {
  const revenue = computeRevenue(orders);
  const count = orders.length;
  const netRevenue = computeNetRevenue(orders);
  const cogsResult = computeCOGS(orders, costOf);
  const { cogs, productsWithoutCost, unitsCovered, unitsMissing } = cogsResult;

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
      costCoverage: costCoverage(cogsResult),
      // Parcial siempre que falte algún costo variable o haya unidades sin costo.
      contributionIsPartial: MISSING_COST_TYPES.length > 0 || unitsMissing > 0,
    },
  };
}

// ─── Top products ────────────────────────────────────────────────────────────

export interface ProductRank {
  productId: number;
  name: string;
  units: number;
  revenue: number;
  /** COGS conocido de este producto en el período, o null si no tiene costo. */
  cogs: number | null;
  /** revenue − cogs, o null si el costo no está configurado. */
  contribution: number | null;
}

/** Ranking de productos por revenue en el período. */
export function computeTopProducts(orders: FinanceOrder[], costOf: CostLookup, limit = 5): ProductRank[] {
  const acc = new Map<number, { name: string; units: number; revenue: number; hasCost: boolean; cogs: number }>();
  for (const o of orders) {
    for (const li of o.lineItems) {
      const cur = acc.get(li.productId) || { name: li.name || `#${li.productId}`, units: 0, revenue: 0, hasCost: true, cogs: 0 };
      if (li.name) cur.name = li.name;
      cur.units += li.quantity || 0;
      cur.revenue += li.lineTotal || 0;
      const unit = costOf(li.productId);
      if (unit === undefined || unit === null) cur.hasCost = false;
      else cur.cogs += unit * (li.quantity || 0);
      acc.set(li.productId, cur);
    }
  }
  return [...acc.entries()]
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      units: v.units,
      revenue: round2(v.revenue),
      cogs: v.hasCost ? round2(v.cogs) : null,
      contribution: v.hasCost ? round2(v.revenue - v.cogs) : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// ─── Clientes: nuevos vs recurrentes ─────────────────────────────────────────

export interface CustomerOrder {
  /** Clave de cliente (email normalizado, o id). */
  customerKey: string;
  /** Instante del pedido (ms). */
  ms: number;
  /** Revenue del pedido. */
  total: number;
}

export interface CustomerSplit {
  newCount: number;
  recurringCount: number;
  /** % de clientes del período que son recurrentes, 0..1. */
  recurringPct: number;
  revenueNew: number;
  revenueRecurring: number;
}

/**
 * Clasifica los pedidos del período en clientes nuevos vs recurrentes usando el
 * historial (todos los pedidos hasta el fin del período). Un cliente es "nuevo"
 * si su PRIMER pedido cae dentro del período; "recurrente" si ya había comprado
 * antes. Woo sigue siendo la fuente — no se crea base de clientes paralela.
 */
export function classifyCustomers(history: CustomerOrder[], periodStartMs: number, periodEndMs: number): CustomerSplit {
  const firstByKey = new Map<string, number>();
  for (const o of history) {
    const prev = firstByKey.get(o.customerKey);
    if (prev === undefined || o.ms < prev) firstByKey.set(o.customerKey, o.ms);
  }
  const inPeriod = history.filter((o) => o.ms >= periodStartMs && o.ms < periodEndMs);
  const newKeys = new Set<string>();
  const recKeys = new Set<string>();
  let revenueNew = 0, revenueRecurring = 0;
  for (const o of inPeriod) {
    const first = firstByKey.get(o.customerKey)!;
    const isNew = first >= periodStartMs;
    if (isNew) { newKeys.add(o.customerKey); revenueNew += o.total; }
    else { recKeys.add(o.customerKey); revenueRecurring += o.total; }
  }
  const total = newKeys.size + recKeys.size;
  return {
    newCount: newKeys.size,
    recurringCount: recKeys.size,
    recurringPct: total > 0 ? recKeys.size / total : 0,
    revenueNew: round2(revenueNew),
    revenueRecurring: round2(revenueRecurring),
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
