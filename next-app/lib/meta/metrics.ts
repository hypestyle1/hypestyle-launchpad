// Advertising Economics — definiciones CENTRALES (Paso 03). Ninguna de estas
// fórmulas se recalcula dentro de componentes React ni en dos lados distintos.
//
// Tres realidades SEPARADAS (nunca se mezclan):
//  1. META PLATFORM  — lo que Meta atribuye (spend, attributed purchases/value, ROAS, CPA).
//  2. BUSINESS       — lo que pasó en Woo/Finance (revenue, orders, customers, contribution).
//  3. BLENDED        — cruce económico (MER, Blended CAC, Ad Spend %, Contribution After Marketing, Operating Profit).
//
// Meta Attributed Revenue ≠ Woo Revenue. Nunca se suman. Meta ROAS usa attributed;
// MER usa Woo. Son dos preguntas distintas.

export type Quality = 'exact' | 'configured' | 'estimated' | 'missing';
export type Currency = 'ARS' | 'USD' | 'EUR';
export type TaxTreatment = 'economic_cost' | 'recoverable' | 'perception' | 'withholding' | 'unknown';

// ── Advertising Cost Model ───────────────────────────────────────────────────
// Nuestro costo real de publicidad NO es sólo Meta Spend: hay impuestos/cargos.
// Effective Advertising Cost = Platform Spend + cargos económicos NO recuperables.
// Los recuperables / percepciones / retenciones NO se restan como costo económico
// final sin tratamiento explícito.

export interface AdvertisingCostRule {
  provider: 'meta';
  validFrom: string;          // 'YYYY-MM-DD'
  validTo: string | null;
  percent?: number | null;    // ej. 0.05 = +5% sobre spend
  fixed?: number | null;      // cargo fijo en ARS por período
  taxTreatment: TaxTreatment;
  source: 'provider' | 'snapshot' | 'configured' | 'manual';
  quality: Quality;
  label?: string;
}

/** ¿El cargo reduce margen económico? Sólo economic_cost lo hace en v1. */
function isEconomic(t: TaxTreatment): boolean { return t === 'economic_cost'; }

function ruleActive(r: AdvertisingCostRule, endISO: string): boolean {
  const end = endISO.slice(0, 10);
  return r.validFrom <= end && (r.validTo === null || r.validTo >= endISO.slice(0, 10));
}

export interface EffectiveAdCost {
  platformSpend: number;      // EXACT de Meta Insights
  economicUplift: number;     // cargos NO recuperables (configured/estimated)
  effective: number;          // platformSpend + economicUplift
  spendQuality: Quality;      // 'exact' si viene de Meta
  upliftQuality: Quality;     // 'configured'/'estimated'/'missing'
  mixed: boolean;             // spend exact + uplift configured → calidad mixta
  rulesApplied: number;
}

/** Effective Advertising Cost. Sin reglas configuradas, uplift = 0 y su calidad es
 *  'missing' (impuestos de Ads sin configurar) — NO se asume 0 como si fuera exacto. */
export function effectiveAdCost(platformSpend: number, rules: AdvertisingCostRule[], endISO: string): EffectiveAdCost {
  const active = rules.filter((r) => ruleActive(r, endISO) && isEconomic(r.taxTreatment));
  let uplift = 0;
  let worst: Quality = 'missing';
  const rank: Record<Quality, number> = { exact: 3, configured: 2, estimated: 1, missing: 0 };
  for (const r of active) {
    uplift += (r.percent ? platformSpend * r.percent : 0) + (r.fixed || 0);
    if (rank[r.quality] < rank[worst] || worst === 'missing') worst = r.quality;
  }
  const upliftQuality: Quality = active.length ? worst : 'missing';
  return {
    platformSpend,
    economicUplift: uplift,
    effective: platformSpend + uplift,
    spendQuality: 'exact',
    upliftQuality,
    mixed: active.length > 0,
    rulesApplied: active.length,
  };
}

// ── Platform metrics (fuente META) ───────────────────────────────────────────
/** Meta ROAS = Attributed Purchase Value / Platform Spend. Tal cual la plataforma. */
export function metaRoas(attributedValue: number, platformSpend: number): number | null {
  return platformSpend > 0 ? attributedValue / platformSpend : null;
}
/** Meta CPA = Platform Spend / Attributed Purchases. */
export function metaCpa(platformSpend: number, purchases: number): number | null {
  return purchases > 0 ? platformSpend / purchases : null;
}

// ── Blended metrics (cruce económico) ────────────────────────────────────────
/** MER = Woo Revenue / Effective Advertising Cost. Usa Woo, NO attributed. */
export function mer(wooRevenue: number, effectiveCost: number): number | null {
  return effectiveCost > 0 ? wooRevenue / effectiveCost : null;
}
/** Blended CAC = Effective Advertising Cost / New Customers (de Woo). */
export function blendedCac(effectiveCost: number, newCustomers: number): number | null {
  return newCustomers > 0 ? effectiveCost / newCustomers : null; // 0 nuevos → null (no Infinity)
}
/** Ad Spend % Revenue = Effective Advertising Cost / Woo Revenue. */
export function adSpendPctRevenue(effectiveCost: number, wooRevenue: number): number | null {
  return wooRevenue > 0 ? effectiveCost / wooRevenue : null;
}

/** Breakeven ROAS del negocio, derivado del margen PRE-AD real (no benchmarks).
 *  Si el negocio conserva m = Contribution Profit / Net Revenue antes de publicidad,
 *  el punto de equilibrio es Revenue/Spend = 1/m. */
export function breakevenRoas(contributionProfit: number, netRevenue: number): number | null {
  const m = netRevenue > 0 ? contributionProfit / netRevenue : 0;
  return m > 0 ? 1 / m : null;
}

export type BreakevenSignal = 'above' | 'near' | 'below' | 'unknown';
/** Señal comparando Meta ROAS vs Breakeven (thresholds derivados, no inventados). */
export function breakevenSignal(roas: number | null, breakeven: number | null): BreakevenSignal {
  if (roas == null || breakeven == null) return 'unknown';
  if (roas >= breakeven * 1.1) return 'above';
  if (roas >= breakeven * 0.9) return 'near';
  return 'below';
}

/** Contribution After Marketing = Contribution Profit − Effective Advertising Cost.
 *  NUNCA reemplaza Contribution Profit; se muestran ambos. */
export function contributionAfterMarketing(contributionProfit: number, effectiveCost: number): number {
  return contributionProfit - effectiveCost;
}
export function camMargin(cam: number, netRevenue: number): number | null {
  return netRevenue > 0 ? cam / netRevenue : null;
}

/** Operating Profit Estimated = Contribution After Marketing − Operating Expenses.
 *  NO es Net Profit (no hay contabilidad fiscal). Es 'partial' si faltan OpEx. */
export function operatingProfitEstimated(cam: number, operatingExpenses: number): number {
  return cam - operatingExpenses;
}
