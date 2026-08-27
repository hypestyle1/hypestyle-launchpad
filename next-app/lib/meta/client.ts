// Cliente de Meta Marketing API — READ ONLY, server-side. El token NUNCA sale del
// servidor (no browser, no respuesta, no logs, no query). Insights por nivel en
// llamadas agregadas (no N+1). Cache in-memory por (nivel, rango) con TTL. La
// cuenta es ARS y timezone AR, así que no hay conversión de moneda ni de fecha.

export const META_VERSION = process.env.META_API_VERSION || 'v26.0';
const META_TOKEN = (process.env.META_ACCESS_TOKEN || '').trim();
const META_ACCOUNT = (process.env.META_AD_ACCOUNT_ID || 'act_202030354217204').trim();
const GRAPH = `https://graph.facebook.com/${META_VERSION}`;

export function metaConfigured(): boolean { return !!META_TOKEN; }
export function metaAccountId(): string { return META_ACCOUNT; }

// Prioridad de action_type para "compras". Meta devuelve muchas variantes con el
// MISMO valor (omni_purchase, purchase, offsite_conversion.fb_pixel_purchase, …):
// hay que elegir UNA, nunca sumarlas. omni_purchase es el total deduplicado.
const PURCHASE_PRIORITY = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'];

function pickAction(arr: any[] | undefined, priority: string[]): number {
  if (!Array.isArray(arr)) return 0;
  for (const type of priority) {
    const hit = arr.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

export interface MetaInsight {
  id?: string; name?: string; status?: string;
  campaignId?: string; campaignName?: string; adsetId?: string; adsetName?: string;
  spend: number; impressions: number; reach: number; clicks: number;
  cpm: number; ctr: number; cpc: number; frequency: number;
  purchases: number; purchaseValue: number; roas: number | null;
}

export function parseInsightRow(r: any): MetaInsight {
  const spend = Number(r.spend) || 0;
  const purchases = pickAction(r.actions, PURCHASE_PRIORITY);
  const purchaseValue = pickAction(r.action_values, PURCHASE_PRIORITY);
  // ROAS: preferimos el que reporta la plataforma (omni_purchase), si no lo derivamos.
  const roasArr = r.purchase_roas;
  const roasReported = Array.isArray(roasArr)
    ? Number((roasArr.find((a: any) => a.action_type === 'omni_purchase') || roasArr[0])?.value) || null
    : null;
  return {
    // id/name del nivel MÁS específico presente (ad → adset → campaign), para que
    // las filas de ad set y de ad no colisionen con el id de la campaña.
    id: r.ad_id || r.adset_id || r.campaign_id || undefined,
    name: r.ad_name || r.adset_name || r.campaign_name || undefined,
    campaignId: r.campaign_id, campaignName: r.campaign_name,
    adsetId: r.adset_id, adsetName: r.adset_name,
    spend, impressions: Number(r.impressions) || 0, reach: Number(r.reach) || 0,
    clicks: Number(r.clicks) || 0, cpm: Number(r.cpm) || 0, ctr: Number(r.ctr) || 0,
    cpc: Number(r.cpc) || 0, frequency: Number(r.frequency) || 0,
    purchases, purchaseValue,
    roas: roasReported != null ? roasReported : (spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null),
  };
}

const INSIGHT_FIELDS = 'spend,impressions,reach,clicks,cpm,ctr,cpc,frequency,actions,action_values,purchase_roas';
const LEVEL_ID_FIELDS: Record<string, string> = {
  account: '', campaign: ',campaign_id,campaign_name', adset: ',campaign_id,campaign_name,adset_id,adset_name', ad: ',campaign_id,adset_id,ad_id,ad_name',
};

// Cache COMPARTIDO real: Vercel Data Cache vía fetch revalidate. Sobrevive cold
// starts y se comparte entre instancias (a diferencia de un Map en memoria); se
// limpia en cada deploy. Stale-while-revalidate: sirve el último válido mientras
// refresca en background. TTL 10min. El token va en la URL → server-side only.
const REVALIDATE = 600;

async function graphGet(path: string, forceFresh = false): Promise<any> {
  const url = `${GRAPH}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(META_TOKEN)}`;
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, forceFresh ? { cache: 'no-store' } : { next: { revalidate: REVALIDATE } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { lastErr = new Error(`meta ${res.status}`); await new Promise((r) => setTimeout(r, 400 * (attempt + 1))); continue; }
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `meta ${res.status}`);
  }
  throw lastErr || new Error('meta unreachable');
}

/** Insights de un nivel para [since, until] (YYYY-MM-DD, TZ de la cuenta = AR). Pagina. */
export async function fetchInsights(level: 'account' | 'campaign' | 'adset' | 'ad', since: string, until: string, opts: { forceFresh?: boolean } = {}): Promise<MetaInsight[]> {
  const fields = INSIGHT_FIELDS + (LEVEL_ID_FIELDS[level] || '');
  const tr = encodeURIComponent(JSON.stringify({ since, until }));
  let path = `/${META_ACCOUNT}/insights?level=${level}&fields=${fields}&time_range=${tr}&limit=200`;
  const out: MetaInsight[] = [];
  for (let page = 0; page < 20; page++) {
    const data = await graphGet(path, opts.forceFresh);
    for (const row of (data.data || [])) out.push(parseInsightRow(row));
    const next = data.paging?.next;
    if (!next) break;
    path = next.replace(GRAPH, '').replace(/&access_token=[^&]+/, '');
  }
  return out;
}

/** effective_status por campaña (Insights no lo trae). Una sola llamada, paginada. */
export async function fetchCampaignStatuses(opts: { forceFresh?: boolean } = {}): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  let path = `/${META_ACCOUNT}/campaigns?fields=id,effective_status,objective&limit=200`;
  for (let page = 0; page < 10; page++) {
    const data = await graphGet(path, opts.forceFresh);
    for (const c of (data.data || [])) m.set(String(c.id), String(c.effective_status || ''));
    const next = data.paging?.next;
    if (!next) break;
    path = next.replace(GRAPH, '').replace(/&access_token=[^&]+/, '');
  }
  return m;
}

export async function fetchAccount(opts: { forceFresh?: boolean } = {}): Promise<{ name: string; currency: string; timezone: string; status: number }> {
  const d = await graphGet(`/${META_ACCOUNT}?fields=name,currency,timezone_name,account_status`, opts.forceFresh);
  return { name: d.name, currency: d.currency, timezone: d.timezone_name, status: Number(d.account_status) };
}

/** Datos de cuenta + campañas para un rango. La reliability la da el Vercel Data
 *  Cache (revalidate 10min, compartido y con stale-while-revalidate); NO hay un
 *  Map en memoria que prometa un snapshot persistente por instancia. `force`
 *  saltea el cache pidiendo datos frescos. */
export async function getMetaData(since: string, until: string, force = false): Promise<{ account: any; campaigns: MetaInsight[]; accountRow: MetaInsight | null; statuses: Map<string, string>; at: number; stale: boolean }> {
  const opts = force ? { forceFresh: true } : {};
  const [account, accountRows, campaigns, statuses] = await Promise.all([
    fetchAccount(opts), fetchInsights('account', since, until, opts), fetchInsights('campaign', since, until, opts), fetchCampaignStatuses(opts),
  ]);
  return { account, campaigns, accountRow: accountRows[0] || null, statuses, at: Date.now(), stale: false };
}

/** Insights de ad sets de una campaña, o ads de un ad set (drilldown on-demand). */
export async function fetchChildInsights(level: 'adset' | 'ad', filter: { campaignId?: string; adsetId?: string }, since: string, until: string): Promise<MetaInsight[]> {
  const all = await fetchInsights(level, since, until);
  return all.filter((r) => (filter.adsetId ? r.adsetId === filter.adsetId : true) && (filter.campaignId ? r.campaignId === filter.campaignId : true));
}
