// Compose: la única parte del brief que decide qué entra. Pura.
//
//   score = impacto ARS × urgencia (1..2) × peso(confianza)
//
// Entra lo que supera el piso, es crítico o trae una exención explícita del
// dominio (`floorExempt`). El score nunca se infla para entrar. Máximo `maxItems`, máximo
// `maxPerDomain` del mismo dominio. Desempate: link interno primero, después
// el más viejo. Sin piso y sin tope esto sería un feed de alertas.

import type { BriefConfig, BriefSignal, Confidence, ScoredSignal } from './types';

export const CONFIDENCE_WEIGHT: Record<Confidence, number> = { exact: 1, rule: 0.7, estimated: 0.5 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function scoreOf(s: BriefSignal): number {
  const amount = Math.max(0, s.impact.amount || 0);
  return Math.round(amount * clamp(s.urgency || 1, 1, 2) * CONFIDENCE_WEIGHT[s.confidence]);
}

/** Piso: el mayor entre el mínimo fijo y el % del revenue de 30 días. */
export function floorFor(config: BriefConfig, revenue30d: number | null): number {
  const pct = revenue30d && revenue30d > 0 ? revenue30d * config.floorRevenuePct : 0;
  return Math.max(config.floorMinARS, Math.round(pct));
}

function isInternal(href: string): boolean {
  return href.startsWith('/');
}

function byPriority(a: ScoredSignal, b: ScoredSignal): number {
  if (b.score !== a.score) return b.score - a.score;
  const ia = isInternal(a.href) ? 0 : 1, ib = isInternal(b.href) ? 0 : 1;
  if (ia !== ib) return ia - ib;
  return a.observedAt.localeCompare(b.observedAt);
}

/** Deduplica por id conservando la de mayor score. */
export function dedupe(signals: ScoredSignal[]): ScoredSignal[] {
  const best = new Map<string, ScoredSignal>();
  for (const s of signals) {
    const cur = best.get(s.id);
    if (!cur || s.score > cur.score) best.set(s.id, s);
  }
  return [...best.values()];
}

export function compose(
  signals: BriefSignal[],
  opts: { floorARS: number; maxItems: number; maxPerDomain: number },
): { items: ScoredSignal[]; suppressed: number; all: ScoredSignal[] } {
  const scored = dedupe(signals.map((s) => ({ ...s, score: scoreOf(s) }))).sort(byPriority);

  const items: ScoredSignal[] = [];
  const perDomain = new Map<string, number>();
  for (const s of scored) {
    if (items.length >= opts.maxItems) break;
    const passesFloor = s.impact.amount >= opts.floorARS || s.tone === 'critical' || !!s.floorExempt;
    if (!passesFloor) continue;
    const n = perDomain.get(s.domain) || 0;
    if (n >= opts.maxPerDomain) continue;
    perDomain.set(s.domain, n + 1);
    items.push(s);
  }
  return { items, suppressed: scored.length - items.length, all: scored };
}
