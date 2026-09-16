// Runner del brief: carga providers en paralelo (uno que falla = dominio
// degradado, no error), corre las reglas que tienen sus datos, y compone.
// Providers y reglas se inyectan para poder testearlo sin red.

import { DEFAULT_CONFIG } from './config';
import { compose, floorFor } from './score';
import { PROVIDERS, RULES } from './registry';
import type { BriefConfig, BriefContext, BriefInputs, BriefProvider, BriefResponse, BriefRule, BriefSignal, DegradedEntry } from './types';

export interface RunOptions {
  providers?: BriefProvider[];
  rules?: BriefRule[];
  config?: BriefConfig;
  now?: Date;
  debug?: boolean;
  log?: (msg: string) => void;
}

/** Resumen chico de cada provider, solo para ?debug=1: qué vio el brief antes de opinar. */
export function summarizeInputs(inputs: BriefInputs): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const proc = inputs['orders.processing'];
  if (proc) {
    const by: Record<string, number> = {};
    for (const o of proc) by[o.stage] = (by[o.stage] || 0) + 1;
    out['orders.processing'] = { count: proc.length, byStage: by };
  }
  const pend = inputs['orders.pending'];
  if (pend) out['orders.pending'] = { count: pend.length, totalARS: Math.round(pend.reduce((s, o) => s + o.total, 0)), maxTotal: Math.round(Math.max(0, ...pend.map((o) => o.total))) };
  const sales = inputs['sales.30d'];
  if (sales) out['sales.30d'] = { orders: sales.orders, revenue: Math.round(sales.revenue), netRevenue: Math.round(sales.netRevenue), contributionProfit: Math.round(sales.contributionProfit), breakevenRoas: sales.contributionProfit > 0 ? Math.round((sales.netRevenue / sales.contributionProfit) * 100) / 100 : null, topProducts: sales.topProducts.map((p) => `${p.productId} ${p.name} (${p.units}u)`), truncated: sales.truncated };
  const stock = inputs['stock.report'];
  if (stock) out['stock.report'] = { low: stock.low.length, out: stock.out.length, totals: stock.totals };
  const ads = inputs['meta.adsets'];
  if (ads) out['meta.adsets'] = { since: ads.since, until: ads.until, rows: ads.rows.length, active: ads.rows.filter((r) => r.effectiveStatus === 'ACTIVE').length, spend: Math.round(ads.rows.reduce((s, r) => s + r.spend, 0)) };
  return out;
}

function reasonOf(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.slice(0, 200);
}

export async function runBrief(opts: RunOptions = {}): Promise<BriefResponse> {
  const providers = opts.providers ?? PROVIDERS;
  const rules = opts.rules ?? RULES;
  const config = opts.config ?? DEFAULT_CONFIG;
  const now = opts.now ?? new Date();
  const log = opts.log ?? ((m: string) => console.warn(`[brief] ${m}`));

  const settled = await Promise.allSettled(providers.map((p) => p.load({ now, config })));
  const inputs: BriefInputs = {};
  const degraded: DegradedEntry[] = [];
  settled.forEach((r, i) => {
    const p = providers[i];
    if (r.status === 'fulfilled') (inputs as any)[p.key] = r.value;
    else {
      degraded.push({ domain: p.domain, key: p.key, reason: reasonOf(r.reason) });
      log(`provider ${p.key} falló: ${reasonOf(r.reason)}`);
    }
  });

  const revenue30d = inputs['sales.30d']?.revenue ?? null;
  const ctx: BriefContext = { now, floorARS: floorFor(config, revenue30d), revenue30d, config };

  const signals: BriefSignal[] = [];
  const skippedRules: string[] = [];
  for (const rule of rules) {
    if (!rule.requires.every((k) => inputs[k] !== undefined)) { skippedRules.push(rule.id); continue; }
    try {
      signals.push(...rule.evaluate(inputs, ctx));
    } catch (e) {
      degraded.push({ domain: rule.domain, key: `rule:${rule.id}`, reason: reasonOf(e) });
      log(`rule ${rule.id} falló: ${reasonOf(e)}`);
    }
  }

  const { items, suppressed, all } = compose(signals, { floorARS: ctx.floorARS, maxItems: config.maxItems, maxPerDomain: config.maxPerDomain });

  return {
    generatedAt: now.toISOString(),
    items,
    suppressed,
    degraded,
    floorARS: ctx.floorARS,
    revenue30d,
    skippedRules,
    ...(opts.debug ? { all, inputsSummary: summarizeInputs(inputs) } : {}),
  };
}
