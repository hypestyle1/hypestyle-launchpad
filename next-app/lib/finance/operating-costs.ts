// Operating Costs — dominio central (Paso 02.5B).
//
// Capa NUEVA por encima de Contribution Profit: cuánto cuesta MANTENER Hype
// funcionando (SaaS, infra, AI, automatización). NO incluye COGS, gateway fees
// ni shipping (esos viven en Finance Core, nivel contribution) ni Paid Media
// (nivel marketing, entra con Meta en Paso 03).
//
// Reglas clave:
//  - Multi-moneda: cada costo guarda monto y moneda ORIGINAL (USD/EUR/ARS). Nunca
//    se suman monedas distintas; se convierten a ARS con la infra FX existente
//    (lib/fx.ts). El histórico usa el rate actual como proxy → calidad ESTIMATED.
//  - Vigencias: un costo tiene períodos {amount, currency, validFrom, validTo}.
//    Cambiar un precio agrega una vigencia nueva, no reescribe el pasado.
//  - Periodización por día: para cualquier DateRange se prorratea por solape
//    (monthly/annual/weekly/daily). usage = observado (no se prorratea por
//    calendario). one_off = sólo su fecha.
//  - Data quality: exact/configured/estimated/missing es parte del dato.
//    $0 confirmado ≠ missing.

import type { FxRates } from '@/lib/fx';

export type Currency = 'ARS' | 'USD' | 'EUR';
export type CostType = 'fixed' | 'variable' | 'semi_variable' | 'one_off';
export type Frequency = 'monthly' | 'annual' | 'weekly' | 'daily' | 'usage' | 'one_off';
export type Quality = 'exact' | 'configured' | 'estimated' | 'missing';
export type CostSource = 'provider' | 'snapshot' | 'configured' | 'observed' | 'manual';
export type TaxTreatment = 'none' | 'economic_cost' | 'recoverable' | 'perception' | 'withholding' | 'unknown';
export type Category =
  | 'technology' | 'automation' | 'ai' | 'infrastructure' | 'marketing_infra'
  | 'ecommerce' | 'operations' | 'marketing_production' | 'team' | 'physical' | 'finance' | 'other';

export const CATEGORY_LABEL: Record<Category, string> = {
  technology: 'Technology', automation: 'Automation', ai: 'AI', infrastructure: 'Infrastructure',
  marketing_infra: 'Marketing Infra', ecommerce: 'Ecommerce', operations: 'Operations',
  marketing_production: 'Marketing Production', team: 'Team', physical: 'Physical', finance: 'Finance', other: 'Other',
};

/** Vigencia de precio. `amount` null = sin monto configurado (MISSING). */
export interface CostPeriod {
  id: string;
  amount: number | null;
  currency: Currency;
  validFrom: string;        // 'YYYY-MM-DD'
  validTo: string | null;   // null = vigente
  rate?: number | null;     // usage: costo observado por unidad
  usageMetric?: string;     // 'per_message' | 'per_token' | ...
}

export interface OperatingCost {
  id: string;
  name: string;
  provider: string;
  category: Category;
  costType: CostType;
  frequency: Frequency;
  profitLevel: 'operating';
  periods: CostPeriod[];
  source: CostSource;
  quality: Quality;
  taxTreatment: TaxTreatment;
  notes?: string;
  active: boolean;
  bot?: boolean;            // compone el costo del bot (n8n, Upstash, Anthropic, OpenAI)
}

// ── Fechas ──────────────────────────────────────────────────────────────────
const DAY = 86400000;
export function daysInMonth(y: number, m0: number): number { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
function isLeap(y: number): boolean { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInYear(y: number): number { return isLeap(y) ? 366 : 365; }
function toUTCDate(iso: string): number { return Date.parse(iso.length <= 10 ? iso + 'T00:00:00Z' : iso); }
function ymd(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }

/** ¿La vigencia cubre la fecha? validFrom inclusive, validTo inclusive (o abierto). */
function periodCovers(p: CostPeriod, dayMs: number): boolean {
  const from = toUTCDate(p.validFrom);
  const to = p.validTo ? toUTCDate(p.validTo) : Infinity;
  return dayMs >= from && dayMs <= to;
}
export function periodOn(cost: OperatingCost, dayMs: number): CostPeriod | null {
  // El más reciente cuyo validFrom <= day y validTo cubre.
  const covering = cost.periods.filter((p) => periodCovers(p, dayMs));
  if (!covering.length) return null;
  return covering.sort((a, b) => toUTCDate(b.validFrom) - toUTCDate(a.validFrom))[0];
}

// ── Costo en un rango (moneda original, por moneda) ──────────────────────────
export interface RangeCost {
  byCurrency: Record<Currency, number>; // monto ORIGINAL sumado por moneda
  hasMissing: boolean;                   // alguna parte del rango sin monto
  applied: boolean;                      // el costo aplica algo en el rango
}

function emptyByCurrency(): Record<Currency, number> { return { ARS: 0, USD: 0, EUR: 0 }; }

/** Monto ORIGINAL de un costo dentro de [startISO, endISO] (ambos inclusive, por día). */
export function costForRange(cost: OperatingCost, startISO: string, endISO: string): RangeCost {
  const out = emptyByCurrency();
  let hasMissing = false, applied = false;
  if (!cost.active) return { byCurrency: out, hasMissing: false, applied: false };

  const start = toUTCDate(startISO), end = toUTCDate(endISO);
  if (end < start) return { byCurrency: out, hasMissing: false, applied: false };

  // one_off: cada vigencia con amount se imputa entero SOLO si su validFrom cae en el rango.
  if (cost.frequency === 'one_off') {
    for (const p of cost.periods) {
      const d = toUTCDate(p.validFrom);
      if (d >= start && d <= end) {
        applied = true;
        if (p.amount == null) hasMissing = true; else out[p.currency] += p.amount;
      }
    }
    return { byCurrency: out, hasMissing, applied };
  }

  // usage: observado. Sin telemetría por día usamos el amount observado del período
  // prorrateado por días (aproximación marcada ESTIMATED a nivel costo). Cuando haya
  // provider usage real, se reemplaza por usage×rate del rango.
  // Recurrentes (monthly/annual/weekly/daily) y usage: suma por día según la vigencia.
  for (let d = start; d <= end; d += DAY) {
    const p = periodOn(cost, d);
    if (!p) continue;
    applied = true;
    if (p.amount == null) { hasMissing = true; continue; }
    const dt = new Date(d);
    let dayOriginal = 0;
    switch (cost.frequency) {
      case 'monthly': dayOriginal = p.amount / daysInMonth(dt.getUTCFullYear(), dt.getUTCMonth()); break;
      case 'annual':  dayOriginal = p.amount / daysInYear(dt.getUTCFullYear()); break;
      case 'weekly':  dayOriginal = p.amount / 7; break;
      case 'daily':   dayOriginal = p.amount; break;
      case 'usage':   dayOriginal = p.amount / daysInMonth(dt.getUTCFullYear(), dt.getUTCMonth()); break; // observado mensual → diario
      default:        dayOriginal = 0;
    }
    out[p.currency] += dayOriginal;
  }
  return { byCurrency: out, hasMissing, applied };
}

// ── FX: original → ARS ───────────────────────────────────────────────────────
export function convertToARS(byCurrency: Record<Currency, number>, fx: FxRates): number {
  return byCurrency.ARS + byCurrency.USD * fx.USD + byCurrency.EUR * fx.EUR;
}

/** Calidad del FX para el rango: si termina en el mes en curso, el rate vivo es
 *  razonable (configured); si es histórico, el rate actual es un proxy → estimated. */
export function fxQualityFor(endISO: string, now = new Date()): 'configured' | 'estimated' {
  const end = new Date(toUTCDate(endISO));
  return end.getUTCFullYear() === now.getUTCFullYear() && end.getUTCMonth() === now.getUTCMonth() ? 'configured' : 'estimated';
}

// ── Agregación (server-side) ─────────────────────────────────────────────────
const QUALITY_RANK: Record<Quality, number> = { exact: 3, configured: 2, estimated: 1, missing: 0 };

export interface ComputedCost {
  id: string; name: string; provider: string; category: Category;
  costType: CostType; frequency: Frequency; quality: Quality; source: CostSource;
  original: { amount: number; currency: Currency } | null; // monto original del rango (si una sola moneda)
  byCurrency: Record<Currency, number>;
  ars: number; pctOfTotal: number; hasMissing: boolean; active: boolean; bot: boolean;
  taxTreatment: TaxTreatment;
}

export interface OperatingSummary {
  rangeStart: string; rangeEnd: string;
  totalARS: number;
  fixedARS: number;
  variableARS: number;
  saasInfraARS: number;
  byCategory: { category: Category; label: string; ars: number; pct: number }[];
  quality: { exact: number; configured: number; estimated: number; missing: number }; // ponderado por ARS
  missingCount: number;      // costos con monto pendiente
  itemCount: number;
  items: ComputedCost[];
  fxUSD: number; fxEUR: number; fxQuality: 'configured' | 'estimated';
  bot: BotEconomics;
}

export interface BotEconomics {
  totalARS: number;
  fixedARS: number;
  usageARS: number;
  fixedPct: number | null;    // fixed / total
  totalUSDApprox: number | null; // referencia en USD (total ARS / fxUSD)
  costPerMessageARS: number | null; // sólo si hay denominador confiable (no en este PR)
  items: ComputedCost[];
}

function primaryCurrency(byCurrency: Record<Currency, number>): { amount: number; currency: Currency } | null {
  const nonZero = (Object.keys(byCurrency) as Currency[]).filter((c) => byCurrency[c] !== 0);
  if (nonZero.length === 1) return { amount: byCurrency[nonZero[0]], currency: nonZero[0] };
  if (nonZero.length === 0) return { amount: 0, currency: 'ARS' };
  return null; // mezcla de monedas → no hay "original" único
}

export function aggregateOperating(costs: OperatingCost[], startISO: string, endISO: string, fx: FxRates): OperatingSummary {
  const items: ComputedCost[] = [];
  let totalARS = 0, fixedARS = 0, variableARS = 0, saasInfraARS = 0, missingCount = 0;
  const catMap = new Map<Category, number>();
  const q = { exact: 0, configured: 0, estimated: 0, missing: 0 };

  for (const c of costs) {
    const rc = costForRange(c, startISO, endISO);
    if (!rc.applied && !rc.hasMissing) {
      // costo que no toca el rango: lo omitimos del total pero lo listamos con ars 0
    }
    const ars = convertToARS(rc.byCurrency, fx);
    const comp: ComputedCost = {
      id: c.id, name: c.name, provider: c.provider, category: c.category,
      costType: c.costType, frequency: c.frequency, quality: c.quality, source: c.source,
      original: primaryCurrency(rc.byCurrency), byCurrency: rc.byCurrency,
      ars, pctOfTotal: 0, hasMissing: rc.hasMissing, active: c.active, bot: !!c.bot, taxTreatment: c.taxTreatment,
    };
    items.push(comp);

    totalARS += ars;
    if (c.costType === 'fixed') fixedARS += ars;
    else if (c.costType === 'variable' || c.frequency === 'usage') variableARS += ars;
    else fixedARS += ars; // semi_variable/one_off → fijo para el split simple
    if (c.category === 'infrastructure' || c.category === 'technology' || c.category === 'automation') saasInfraARS += ars;
    catMap.set(c.category, (catMap.get(c.category) || 0) + ars);
    if (rc.hasMissing || (c.quality === 'missing')) missingCount += rc.hasMissing ? 1 : 0;

    // Calidad ponderada por ARS (el missing sin monto se cuenta aparte, no pondera $).
    const eff: Quality = rc.hasMissing && ars === 0 ? 'missing' : c.quality;
    if (eff !== 'missing') q[eff] += ars;
  }

  for (const it of items) it.pctOfTotal = totalARS > 0 ? it.ars / totalARS : 0;

  const qTotal = q.exact + q.configured + q.estimated || 1;
  const quality = {
    exact: q.exact / qTotal, configured: q.configured / qTotal, estimated: q.estimated / qTotal,
    missing: missingCount, // conteo, no $ (no tienen monto)
  };

  const byCategory = [...catMap.entries()]
    .map(([category, ars]) => ({ category, label: CATEGORY_LABEL[category], ars, pct: totalARS > 0 ? ars / totalARS : 0 }))
    .filter((c) => c.ars > 0)
    .sort((a, b) => b.ars - a.ars);

  return {
    rangeStart: startISO, rangeEnd: endISO,
    totalARS, fixedARS, variableARS, saasInfraARS,
    byCategory, quality, missingCount, itemCount: items.length, items,
    fxUSD: fx.USD, fxEUR: fx.EUR, fxQuality: fxQualityFor(endISO),
    bot: botEconomics(items, fx),
  };
}

// ── Bot Economics (dinero, NO capacity) ──────────────────────────────────────
export function botEconomics(items: ComputedCost[], fx: FxRates): BotEconomics {
  const botItems = items.filter((i) => i.bot);
  const totalARS = botItems.reduce((s, i) => s + i.ars, 0);
  const fixedARS = botItems.filter((i) => i.costType === 'fixed').reduce((s, i) => s + i.ars, 0);
  const usageARS = botItems.filter((i) => i.costType === 'variable' || i.frequency === 'usage').reduce((s, i) => s + i.ars, 0);
  return {
    totalARS, fixedARS, usageARS,
    fixedPct: totalARS > 0 ? fixedARS / totalARS : null,
    totalUSDApprox: fx.USD > 0 ? totalARS / fx.USD : null,
    costPerMessageARS: null, // requiere denominador confiable de mensajes atendidos (fuente futura)
    items: botItems,
  };
}
