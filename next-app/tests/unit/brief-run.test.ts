import { describe, it, expect } from 'vitest';
import { runBrief } from '@/lib/brief/run';
import { DEFAULT_CONFIG } from '@/lib/brief/config';
import type { BriefProvider, BriefRule, BriefSignal } from '@/lib/brief/types';

const NOW = new Date('2026-09-15T15:00:00.000Z');
const silent = () => {};

const sig = (id: string, amount: number, domain: BriefSignal['domain'] = 'ops'): BriefSignal => ({
  id, domain, rule: 'r', situation: 's', evidence: 'e', action: 'a', href: '/x', hrefLabel: 'Ver',
  impact: { amount, currency: 'ARS', kind: 'retained' }, urgency: 1, confidence: 'exact', tone: 'warning',
  observedAt: NOW.toISOString(), sourceRefs: [],
});

const okProvider: BriefProvider<'orders.processing'> = { key: 'orders.processing', domain: 'ops', load: async () => [] };
const salesProvider: BriefProvider<'sales.30d'> = {
  key: 'sales.30d', domain: 'stock',
  load: async () => ({ startUTC: '', endUTC: '', days: 30, revenue: 20_000_000, netRevenue: 18_000_000, contributionProfit: 9_000_000, orders: 1, aov: 1, topProducts: [], truncated: false }),
};
const brokenProvider: BriefProvider<'meta.adsets'> = { key: 'meta.adsets', domain: 'ads', load: async () => { throw new Error('Meta no configurado'); } };

const ruleOps: BriefRule = { id: 'ops.test', domain: 'ops', requires: ['orders.processing'], evaluate: () => [sig('ops:test:all', 500_000)] };
const ruleAds: BriefRule = { id: 'ads.test', domain: 'ads', requires: ['meta.adsets', 'sales.30d'], evaluate: () => [sig('ads:test:1', 900_000, 'ads')] };
const ruleThrows: BriefRule = { id: 'ops.boom', domain: 'ops', requires: ['orders.processing'], evaluate: () => { throw new Error('regla rota'); } };

describe('runBrief', () => {
  it('un provider que falla degrada su dominio, saltea sus reglas y el resto sale igual', async () => {
    const r = await runBrief({ providers: [okProvider, salesProvider, brokenProvider], rules: [ruleOps, ruleAds], config: DEFAULT_CONFIG, now: NOW, log: silent });
    expect(r.items.map((s) => s.id)).toEqual(['ops:test:all']);
    expect(r.degraded).toEqual([{ domain: 'ads', key: 'meta.adsets', reason: 'Meta no configurado' }]);
    expect(r.skippedRules).toEqual(['ads.test']);
    expect(r.generatedAt).toBe(NOW.toISOString());
  });

  it('el piso sale del revenue de 30 días (1 %) cuando el provider de ventas responde', async () => {
    const r = await runBrief({ providers: [salesProvider], rules: [], config: DEFAULT_CONFIG, now: NOW, log: silent });
    expect(r.revenue30d).toBe(20_000_000);
    expect(r.floorARS).toBe(200_000);
  });

  it('sin ventas usa el piso mínimo', async () => {
    const r = await runBrief({ providers: [okProvider], rules: [ruleOps], config: DEFAULT_CONFIG, now: NOW, log: silent });
    expect(r.revenue30d).toBeNull();
    expect(r.floorARS).toBe(DEFAULT_CONFIG.floorMinARS);
    expect(r.items).toHaveLength(1);
  });

  it('una regla que lanza queda registrada como degradada y no rompe el brief', async () => {
    const r = await runBrief({ providers: [okProvider], rules: [ruleThrows, ruleOps], config: DEFAULT_CONFIG, now: NOW, log: silent });
    expect(r.items.map((s) => s.id)).toEqual(['ops:test:all']);
    expect(r.degraded).toEqual([{ domain: 'ops', key: 'rule:ops.boom', reason: 'regla rota' }]);
  });

  it('debug incluye todas las señales puntuadas; sin debug no', async () => {
    const a = await runBrief({ providers: [okProvider], rules: [ruleOps], config: DEFAULT_CONFIG, now: NOW, log: silent, debug: true });
    expect(a.all?.[0].score).toBe(500_000);
    const b = await runBrief({ providers: [okProvider], rules: [ruleOps], config: DEFAULT_CONFIG, now: NOW, log: silent });
    expect(b.all).toBeUndefined();
  });
});
