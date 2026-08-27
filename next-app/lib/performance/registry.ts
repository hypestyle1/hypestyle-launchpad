// Metric Registry — SÓLO metadata de presentación (label, formato, categoría,
// semántica de comparación, fuente). Las FÓRMULAS siguen en su dominio
// (lib/finance, lib/meta). Acá no se calcula nada; se describe/presenta.

export type MetricFormat = 'ars' | 'int' | 'pct' | 'x' | 'ratio';
export type MetricCategory = 'business' | 'profitability' | 'marketing' | 'costs' | 'customers';
export type ComparisonBehavior = 'up-good' | 'down-good' | 'neutral';
export type MetricSource = 'woo' | 'finance' | 'meta' | 'operating' | 'fx';

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  format: MetricFormat;
  category: MetricCategory;
  comparison: ComparisonBehavior;
  source: MetricSource;
  spark?: boolean;   // tiene serie temporal
}

export const METRICS: Record<string, MetricDefinition> = {
  revenue:        { id: 'revenue', label: 'Revenue', description: 'Facturación de pedidos pagados (Woo).', format: 'ars', category: 'business', comparison: 'up-good', source: 'woo', spark: true },
  netRevenue:     { id: 'netRevenue', label: 'Net Revenue', description: 'Revenue − Refunds.', format: 'ars', category: 'business', comparison: 'up-good', source: 'finance', spark: true },
  orders:         { id: 'orders', label: 'Pedidos', description: 'Pedidos pagados en el período.', format: 'int', category: 'business', comparison: 'up-good', source: 'woo', spark: true },
  aov:            { id: 'aov', label: 'AOV', description: 'Ticket promedio: Revenue / Pedidos.', format: 'ars', category: 'business', comparison: 'up-good', source: 'woo', spark: true },
  newCustomers:   { id: 'newCustomers', label: 'Clientes nuevos', description: 'Primeras compras en el período (Woo).', format: 'int', category: 'customers', comparison: 'up-good', source: 'woo' },
  returningPct:   { id: 'returningPct', label: 'Recurrentes %', description: 'Proporción de clientes recurrentes.', format: 'pct', category: 'customers', comparison: 'up-good', source: 'woo' },

  grossProfit:    { id: 'grossProfit', label: 'Gross Profit', description: 'Net Revenue − COGS.', format: 'ars', category: 'profitability', comparison: 'up-good', source: 'finance', spark: true },
  grossMargin:    { id: 'grossMargin', label: 'Gross Margin', description: 'Gross Profit / Net Revenue.', format: 'pct', category: 'profitability', comparison: 'up-good', source: 'finance' },
  contributionProfit: { id: 'contributionProfit', label: 'Contribution Profit', description: 'Gross Profit − fees − shipping − variables.', format: 'ars', category: 'profitability', comparison: 'up-good', source: 'finance', spark: true },
  contributionMargin: { id: 'contributionMargin', label: 'Contribution Margin', description: 'Contribution Profit / Net Revenue.', format: 'pct', category: 'profitability', comparison: 'up-good', source: 'finance' },
  cam:            { id: 'cam', label: 'Contribution After Mkt', description: 'Contribution Profit − Effective Ad Cost.', format: 'ars', category: 'profitability', comparison: 'up-good', source: 'meta', spark: true },
  camMargin:      { id: 'camMargin', label: 'CAM Margin', description: 'CAM / Net Revenue.', format: 'pct', category: 'profitability', comparison: 'up-good', source: 'meta' },
  operatingProfit:{ id: 'operatingProfit', label: 'Operating Profit Est.', description: 'CAM − Operating Expenses. No es Net Profit.', format: 'ars', category: 'profitability', comparison: 'up-good', source: 'meta', spark: true },
  operatingMargin:{ id: 'operatingMargin', label: 'Operating Margin Est.', description: 'Operating Profit Est. / Net Revenue.', format: 'pct', category: 'profitability', comparison: 'up-good', source: 'meta' },

  adSpend:        { id: 'adSpend', label: 'Meta Spend', description: 'Platform Spend exacto de Meta (ARS).', format: 'ars', category: 'marketing', comparison: 'neutral', source: 'meta', spark: true },
  effectiveAdCost:{ id: 'effectiveAdCost', label: 'Effective Ad Cost', description: 'Spend + cargos económicos no recuperables.', format: 'ars', category: 'marketing', comparison: 'neutral', source: 'meta' },
  metaRoas:       { id: 'metaRoas', label: 'Meta ROAS', description: 'Attributed Value / Spend (Meta atribuido).', format: 'x', category: 'marketing', comparison: 'up-good', source: 'meta', spark: true },
  metaCpa:        { id: 'metaCpa', label: 'Meta CPA', description: 'Spend / Meta Attributed Purchases.', format: 'ars', category: 'marketing', comparison: 'down-good', source: 'meta' },
  mer:            { id: 'mer', label: 'MER', description: 'Woo Revenue / Effective Ad Cost.', format: 'x', category: 'marketing', comparison: 'up-good', source: 'meta', spark: true },
  breakevenRoas:  { id: 'breakevenRoas', label: 'Breakeven ROAS', description: 'ROAS mínimo para no perder plata (margen de contribución).', format: 'x', category: 'marketing', comparison: 'down-good', source: 'finance' },
  blendedCac:     { id: 'blendedCac', label: 'Blended CAC', description: 'Effective Ad Cost / clientes nuevos (Woo).', format: 'ars', category: 'marketing', comparison: 'down-good', source: 'meta', spark: true },
  adSpendPct:     { id: 'adSpendPct', label: 'Ad Spend % Revenue', description: 'Effective Ad Cost / Woo Revenue.', format: 'pct', category: 'marketing', comparison: 'down-good', source: 'meta' },

  cogs:           { id: 'cogs', label: 'COGS', description: 'Costo de productos vendidos.', format: 'ars', category: 'costs', comparison: 'neutral', source: 'finance' },
  paymentFees:    { id: 'paymentFees', label: 'Payment Fees', description: 'Comisiones de pasarela.', format: 'ars', category: 'costs', comparison: 'down-good', source: 'finance' },
  shipping:       { id: 'shipping', label: 'Shipping', description: 'Costo de envío absorbido.', format: 'ars', category: 'costs', comparison: 'down-good', source: 'finance' },
  operatingExpenses: { id: 'operatingExpenses', label: 'Operating Expenses', description: 'Costos operativos (SaaS/infra/AI).', format: 'ars', category: 'costs', comparison: 'neutral', source: 'operating' },
  variableCosts:  { id: 'variableCosts', label: 'Variable Costs', description: 'Costos variables de fulfillment.', format: 'ars', category: 'costs', comparison: 'down-good', source: 'finance' },
};

// KPIs por defecto del grid (12–16 mejores). El resto vive en sus secciones.
export const DEFAULT_KPIS: string[] = [
  'revenue', 'orders', 'contributionProfit', 'operatingProfit',
  'adSpend', 'metaRoas', 'mer', 'blendedCac',
  'cam', 'operatingExpenses', 'breakevenRoas', 'aov',
  'grossMargin', 'contributionMargin', 'metaCpa', 'adSpendPct',
];

// ── Formato ──────────────────────────────────────────────────────────────────
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}
export function fmtMetric(value: number | null, format: MetricFormat, short = false): string {
  if (value == null || !Number.isFinite(value)) return '—';
  switch (format) {
    case 'ars': return short ? fmtShort(value) : `$${Math.round(value).toLocaleString('es-AR')}`;
    case 'int': return Math.round(value).toLocaleString('es-AR');
    case 'pct': return `${(value * 100).toFixed(1).replace('.', ',')}%`;
    case 'x': return `${value.toFixed(2).replace('.', ',')}×`;
    default: return String(value);
  }
}
export function fmtFull(value: number | null, format: MetricFormat): string {
  return fmtMetric(value, format, false);
}
