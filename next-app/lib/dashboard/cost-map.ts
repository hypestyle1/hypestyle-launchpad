// Mapa producto → costo unitario configurado en Hype, para calcular COGS.
// Junta dos fuentes (WP option de perfiles + meta _hs_cost_profile_id por
// producto en Woo) en una función de lookup. Se cachea en memoria por proceso
// (los costos cambian poco) para no rebarrer el catálogo en cada request del
// Dashboard.

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = (process.env.WP_SECRET || '').trim();
const WC_KEY    = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC    = (process.env.WC_CONSUMER_SECRET || '').trim();

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

export interface CostMap {
  /** Costo unitario del producto, o undefined si no tiene perfil de costo. */
  costOf: (productId: number) => number | undefined;
  productsTotal: number;
  productsWithoutCost: number;
}

interface Cached { at: number; map: CostMap; }
let cache: Cached | null = null;
const TTL_MS = 5 * 60_000;

async function fetchProfileUnitCosts(): Promise<Map<string, number>> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/cost-profiles?_cb=${Date.now()}`, {
    headers: { 'X-Hypestyle-Secret': WP_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`cost-profiles ${res.status}`);
  const data = await res.json();
  const m = new Map<string, number>();
  for (const p of (data.profiles || [])) {
    const unit = Number(p.unitCost);
    if (p.id) m.set(String(p.id), Number.isFinite(unit) ? unit : 0);
  }
  return m;
}

async function fetchProductProfileIds(): Promise<Map<number, string>> {
  const m = new Map<number, string>();
  for (let page = 1; ; page++) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/products?per_page=100&page=${page}&status=publish&_fields=id,meta_data&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' }
    );
    if (!res.ok) break;
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || !data.length) break;
    for (const p of data) {
      const pid = (p.meta_data as any[])?.find((x) => x.key === '_hs_cost_profile_id')?.value || '';
      m.set(Number(p.id), String(pid));
    }
    if (data.length < 100) break;
  }
  return m;
}

export async function getCostMap(force = false): Promise<CostMap> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.map;

  const [profileCosts, productProfiles] = await Promise.all([
    fetchProfileUnitCosts(),
    fetchProductProfileIds(),
  ]);

  // productId → unitCost (sólo si el producto tiene perfil y el perfil existe).
  const perProduct = new Map<number, number>();
  let withoutCost = 0;
  for (const [pid, profileId] of productProfiles) {
    const unit = profileId ? profileCosts.get(profileId) : undefined;
    if (unit === undefined) withoutCost++;
    else perProduct.set(pid, unit);
  }

  const map: CostMap = {
    costOf: (productId: number) => perProduct.get(productId),
    productsTotal: productProfiles.size,
    productsWithoutCost: withoutCost,
  };
  cache = { at: Date.now(), map };
  return map;
}
