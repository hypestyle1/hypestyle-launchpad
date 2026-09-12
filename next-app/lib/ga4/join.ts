// Cruce Meta Ads × GA4 por campaña. PURO, testeable.
//
// Los ads llegan al sitio con `utm_campaign` y GA lo guarda tal cual en
// `sessionCampaignName`. El problema es que en la cuenta conviven dos
// convenciones: campañas con nombre (`cold-archive`, `hs-co-green`) y campañas
// con `{{campaign.id}}` en la URL, que llegan como el ID numérico de Meta
// (`120243208915510027`). Este módulo resuelve ambas contra la lista de
// campañas de Meta y arma UNA fila por campaña con las dos fuentes lado a lado.
//
// Lo que Meta "atribuye" y lo que GA "ve" son cosas distintas y NO se suman:
//   - Meta: spend exacto, compras atribuidas (ventana de atribución, incluye
//     view-through), ROAS de plataforma.
//   - GA: sesiones y comportamiento REAL en el sitio de quien hizo click.
// Juntas responden "cuánto tráfico compró cada campaña y qué hizo ese tráfico".

import type { MetaInsight } from '@/lib/meta/client';
import type { GaCampaign } from './reports';

export interface PautaRow {
  campaignId: string | null;
  name: string;
  status?: string;
  // Meta
  spend: number; impressions: number; clicks: number; metaPurchases: number; metaPurchaseValue: number; metaRoas: number | null;
  // GA (sumado sobre todas las etiquetas que matchearon)
  gaNames: string[];
  sessions: number; activeUsers: number; engagementRate: number | null;
  addToCarts: number; checkouts: number; gaPurchases: number; gaRevenue: number;
  // Derivados
  costPerSession: number | null;     // spend / sesiones GA
  sessionConversion: number | null;  // compras GA / sesiones GA
  clickToSession: number | null;     // sesiones GA / clicks Meta (cuánto del click llega)
}

export interface PautaJoin {
  matched: PautaRow[];
  /** Etiquetas de GA que no corresponden a ninguna campaña de Meta (orgánico, mail, referral, campañas viejas…). */
  unmatched: GaCampaign[];
}

/** Normaliza para comparar: minúsculas, sin acentos, sólo [a-z0-9] separados por '-'. */
export function slug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GA_PLACEHOLDERS = new Set(['(not set)', '(direct)', '(organic)', '(referral)', '(ai-assistant)', '--sanitized--', '']);

/**
 * Encuentra la campaña de Meta que corresponde a una etiqueta de GA.
 *   1. ID numérico de Meta → match exacto por campaignId.
 *   2. Slug idéntico al nombre de la campaña.
 *   3. El slug de GA es prefijo del nombre, o todos sus tokens aparecen en él.
 * Si hay varias candidatas se elige la de nombre más corto (la más genérica):
 * `cold-archive` matchea "COLD ARCHIVE" antes que "COLD ARCHIVE — Remarketing".
 * Con los placeholders de GA no se intenta nada.
 */
export function matchCampaign(gaName: string, metaCampaigns: MetaInsight[]): MetaInsight | null {
  const label = (gaName || '').trim();
  if (GA_PLACEHOLDERS.has(label.toLowerCase())) return null;

  if (/^\d{10,}$/.test(label)) {
    return metaCampaigns.find((c) => c.campaignId === label) || null;
  }

  const s = slug(label);
  if (!s) return null;
  const withSlug = metaCampaigns
    .filter((c) => c.campaignName)
    .map((c) => ({ c, ms: slug(c.campaignName!) }));

  const exact = withSlug.filter((x) => x.ms === s);
  if (exact.length) return exact[0].c;

  const tokens = s.split('-').filter(Boolean);
  const loose = withSlug.filter((x) => {
    if (x.ms.startsWith(`${s}-`)) return true;
    const mt = new Set(x.ms.split('-'));
    return tokens.length >= 2 && tokens.every((t) => mt.has(t));
  });
  if (!loose.length) return null;
  loose.sort((a, b) => a.ms.length - b.ms.length);
  return loose[0].c;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function joinMetaWithGa(metaCampaigns: MetaInsight[], gaCampaigns: GaCampaign[]): PautaJoin {
  const byMeta = new Map<string, { meta: MetaInsight; ga: GaCampaign[] }>();
  for (const m of metaCampaigns) {
    const key = m.campaignId || m.id || m.campaignName || '';
    if (key) byMeta.set(key, { meta: m, ga: [] });
  }

  const unmatched: GaCampaign[] = [];
  for (const g of gaCampaigns) {
    const hit = matchCampaign(g.campaign, metaCampaigns);
    const key = hit ? (hit.campaignId || hit.id || hit.campaignName || '') : '';
    const slot = key ? byMeta.get(key) : undefined;
    if (slot) slot.ga.push(g);
    else unmatched.push(g);
  }

  const matched: PautaRow[] = [];
  for (const { meta, ga } of byMeta.values()) {
    const sessions = ga.reduce((s, g) => s + g.sessions, 0);
    const gaPurchases = ga.reduce((s, g) => s + g.purchases, 0);
    // Tasa de interacción ponderada por sesiones (promediar tasas mentiría).
    const engaged = ga.reduce((s, g) => s + g.engagementRate * g.sessions, 0);
    if (meta.spend <= 0 && sessions <= 0) continue;
    matched.push({
      campaignId: meta.campaignId || null,
      name: meta.campaignName || meta.name || meta.campaignId || '—',
      status: meta.status,
      spend: meta.spend, impressions: meta.impressions, clicks: meta.clicks,
      metaPurchases: meta.purchases, metaPurchaseValue: meta.purchaseValue, metaRoas: meta.roas,
      gaNames: ga.map((g) => g.campaign),
      sessions,
      activeUsers: ga.reduce((s, g) => s + g.activeUsers, 0),
      engagementRate: sessions > 0 ? engaged / sessions : null,
      addToCarts: ga.reduce((s, g) => s + g.addToCarts, 0),
      checkouts: ga.reduce((s, g) => s + g.checkouts, 0),
      gaPurchases,
      gaRevenue: ga.reduce((s, g) => s + g.purchaseRevenue, 0),
      costPerSession: ratio(meta.spend, sessions),
      sessionConversion: ratio(gaPurchases, sessions),
      clickToSession: ratio(sessions, meta.clicks),
    });
  }
  matched.sort((a, b) => b.spend - a.spend || b.sessions - a.sessions);
  unmatched.sort((a, b) => b.sessions - a.sessions);
  return { matched, unmatched };
}
