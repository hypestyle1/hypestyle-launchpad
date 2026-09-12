import { describe, it, expect } from 'vitest';
import { slug, matchCampaign, joinMetaWithGa } from '@/lib/ga4/join';
import type { MetaInsight } from '@/lib/meta/client';
import type { GaCampaign } from '@/lib/ga4/reports';

const meta = (campaignId: string, campaignName: string, extra: Partial<MetaInsight> = {}): MetaInsight => ({
  id: campaignId, name: campaignName, campaignId, campaignName, status: 'ACTIVE',
  spend: 100000, impressions: 50000, reach: 30000, clicks: 1000, cpm: 2000, ctr: 2, cpc: 100, frequency: 1.6,
  purchases: 5, purchaseValue: 500000, roas: 5, ...extra,
});
const ga = (campaign: string, sessions: number, extra: Partial<GaCampaign> = {}): GaCampaign => ({
  campaign, sourceMedium: 'ig / paid', sessions, activeUsers: Math.round(sessions * 0.9), engagementRate: 0.5,
  addToCarts: 10, checkouts: 3, purchases: 1, purchaseRevenue: 90000, ...extra,
});

// Nombres reales de la cuenta (12/09/2026) y etiquetas reales del export de GA.
const CAMPAIGNS: MetaInsight[] = [
  meta('120243208915510027', 'Catálogo Hypestyle'),
  meta('120247574925330027', 'OOTD Glass Card — CBO (Mica y Roy)'),
  meta('120248017031910027', 'Regular 3 PACK — Promo'),
  meta('1', 'COLD ARCHIVE'),
  meta('2', 'COLD ARCHIVE — Remarketing'),
  meta('3', 'HS CO GREEN — Drop'),
  meta('4', 'GIFT CARD — Anuncio'),
];

describe('slug', () => {
  it('normaliza acentos, mayúsculas, guiones largos y espacios', () => {
    expect(slug('Catálogo Hypestyle')).toBe('catalogo-hypestyle');
    expect(slug('OOTD Glass Card — CBO (Mica y Roy)')).toBe('ootd-glass-card-cbo-mica-y-roy');
    expect(slug('  cold-archive ')).toBe('cold-archive');
  });
});

describe('matchCampaign', () => {
  it('ID numérico de Meta ({{campaign.id}} en la URL) → match exacto', () => {
    expect(matchCampaign('120243208915510027', CAMPAIGNS)?.campaignName).toBe('Catálogo Hypestyle');
    expect(matchCampaign('120248017031910027', CAMPAIGNS)?.campaignName).toBe('Regular 3 PACK — Promo');
  });
  it('ID que no existe → null (no inventa)', () => {
    expect(matchCampaign('999999999999999999', CAMPAIGNS)).toBeNull();
  });
  it('slug idéntico', () => {
    expect(matchCampaign('cold-archive', CAMPAIGNS)?.campaignId).toBe('1');
  });
  it('prefijo: hs-co-green matchea "HS CO GREEN — Drop"', () => {
    expect(matchCampaign('hs-co-green', CAMPAIGNS)?.campaignId).toBe('3');
  });
  it('varias candidatas → la de nombre más corto (la genérica, no el remarketing)', () => {
    expect(matchCampaign('cold archive', CAMPAIGNS)?.campaignId).toBe('1');
  });
  it('tokens: giftcard-anuncio-0309 NO matchea (giftcard ≠ gift-card) y queda como origen aparte', () => {
    expect(matchCampaign('giftcard-anuncio-0309', CAMPAIGNS)).toBeNull();
  });
  it('placeholders de GA nunca matchean', () => {
    for (const p of ['(not set)', '(organic)', '(referral)', '(direct)', '']) expect(matchCampaign(p, CAMPAIGNS)).toBeNull();
  });
  it('un token suelto y genérico no matchea por contener', () => {
    // "drop" aparece en "hs-co-green-drop" pero un solo token no alcanza.
    expect(matchCampaign('drop', CAMPAIGNS)).toBeNull();
  });
});

describe('joinMetaWithGa', () => {
  const gaRows: GaCampaign[] = [
    ga('cold-archive', 4130, { engagementRate: 0.6, purchases: 1 }),
    ga('120243208915510027', 4491, { engagementRate: 0.5, purchases: 0 }),
    ga('COLD ARCHIVE', 100, { engagementRate: 0.2, purchases: 0 }), // misma campaña, utm con otra grafía
    ga('(organic)', 1124, { sourceMedium: 'google / organic' }),
    ga('mayorista-250826', 814, { sourceMedium: 'brevo / email' }),
  ];
  const out = joinMetaWithGa(CAMPAIGNS, gaRows);

  it('suma las etiquetas que caen en la misma campaña y pondera la interacción por sesiones', () => {
    const cold = out.matched.find((r) => r.campaignId === '1')!;
    expect(cold.sessions).toBe(4230);
    expect(cold.gaNames).toEqual(['cold-archive', 'COLD ARCHIVE']);
    // (0.6*4130 + 0.2*100) / 4230
    expect(cold.engagementRate).toBeCloseTo((0.6 * 4130 + 0.2 * 100) / 4230, 6);
  });
  it('derivados: costo por sesión, conversión de sesión y click→sesión', () => {
    const cat = out.matched.find((r) => r.campaignId === '120243208915510027')!;
    expect(cat.costPerSession).toBeCloseTo(100000 / 4491, 6);
    expect(cat.sessionConversion).toBe(0);
    expect(cat.clickToSession).toBeCloseTo(4491 / 1000, 6);
  });
  it('campaña con spend pero sin utm en GA queda con sesiones 0 y sin derivados', () => {
    const gift = out.matched.find((r) => r.campaignId === '4')!;
    expect(gift.sessions).toBe(0);
    expect(gift.gaNames).toEqual([]);
    expect(gift.costPerSession).toBeNull();
    expect(gift.engagementRate).toBeNull();
  });
  it('lo que no es Meta va a unmatched, ordenado por sesiones', () => {
    expect(out.unmatched.map((u) => u.campaign)).toEqual(['(organic)', 'mayorista-250826']);
  });
  it('ordena matched por spend y después por sesiones', () => {
    const spends = out.matched.map((r) => r.spend);
    expect([...spends].sort((a, b) => b - a)).toEqual(spends);
  });
  it('campañas sin spend ni tráfico se omiten', () => {
    const quiet = joinMetaWithGa([meta('9', 'VIEJA', { spend: 0 })], []);
    expect(quiet.matched).toEqual([]);
  });
});
