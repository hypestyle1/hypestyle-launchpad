// Datos para el preview financiero de una campaña mayorista (server only).
//
// Junta tres fuentes que ya existen, sin duplicar nada:
//  - WC REST: productos publicados con su perfil de costo (`_hs_cost_profile_id`)
//    y, para los productos de la campaña, el stock exacto por variación
//    (manage_stock + stock_quantity, igual que /api/admin/mayorista-precios-audit).
//  - WPGraphQL (lib/mayorista-products.ts): PVP real por producto y pertenencia
//    al catálogo mayorista (el regular_price de un variable vive en las
//    variaciones, que REST no trae en el listado).
//  - Perfiles de costo (option hs_cost_profiles) para el COGS y su confiabilidad.
//
// El stock NO se toma del catálogo GraphQL: ahí un talle sin gestión de stock
// deja el producto entero en null (24/09: 7 productos de la Private Stock
// Sale quedaron "sin gestión" y el preview vivo dio 1.096 u en vez de 1.206).

import { mapLimit } from './map-limit';
import { fetchMayoristaPriceIndex } from './mayorista-products';
import { normalizeProfiles, isConfigured, hasIncompleteComponent } from './cost-profiles';
import { costProfileLooksProvisional } from './wholesale-margin-risk';
import type { PreviewProduct } from './wholesale-campaigns';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const WP_SECRET = process.env.WP_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function wc(path: string) {
  const sep = path.includes('?') ? '&' : '?';
  // _cb: la CDN de Hostinger cachea los GET por URL exacta.
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${path}${sep}_cb=${Date.now()}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
  if (!res.ok) throw new Error(`WC ${res.status} en ${path}`);
  return res.json();
}

async function fetchWcProducts(): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const data = (await wc(`products?status=publish&per_page=100&page=${page}&_fields=id,name,slug,type,stock_status,stock_quantity,manage_stock,meta_data`)) as any[];
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

async function fetchCostByProfile(): Promise<Map<string, { unitCost: number; reliable: boolean }>> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/cost-profiles?_cb=${Date.now()}`, { headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store' });
  if (!res.ok) throw new Error(`WP ${res.status} leyendo cost-profiles`);
  // El PHP responde { profiles: [...] } (mismo shape que consume /admin/costos).
  const data = await res.json();
  const profiles = normalizeProfiles(Array.isArray(data) ? data : data?.profiles ?? []);
  return new Map(profiles.map(p => [p.id, { unitCost: p.unitCost, reliable: isConfigured(p) && !hasIncompleteComponent(p) && !costProfileLooksProvisional(p.name) }]));
}

const qty = (x: any): number | null => (x?.manage_stock && typeof x.stock_quantity === 'number') ? Math.max(0, x.stock_quantity) : null;

/** Stock por producto: suma de variaciones publicadas con gestión de stock.
 *  null solo si NINGUNA variación gestiona stock (Half-Zips). Una variación
 *  sin gestión entre otras gestionadas cuenta 0 y no anula el producto. */
async function fetchStock(products: any[]): Promise<Map<number, number | null>> {
  const out = new Map<number, number | null>();
  await mapLimit(products, 3, async (p) => {
    if (p.type !== 'variable') { out.set(p.id, qty(p)); return; }
    const vs = (await wc(`products/${p.id}/variations?status=publish&per_page=100&_fields=id,manage_stock,stock_quantity`)) as any[];
    const managed = vs.map(qty).filter((n): n is number => n != null);
    out.set(p.id, managed.length ? managed.reduce((s, n) => s + n, 0) : null);
  });
  return out;
}

/** Costo unitario conocido por producto (null = sin perfil confiable). Para
 *  los resultados de campaña: sin stock ni precios, 2 llamadas. */
export async function loadCostIndex(): Promise<Map<number, number | null>> {
  const [wcProducts, costs] = await Promise.all([fetchWcProducts(), fetchCostByProfile()]);
  const out = new Map<number, number | null>();
  for (const p of wcProducts) {
    const profileId = String((p.meta_data as any[])?.find((m: any) => m.key === '_hs_cost_profile_id')?.value || '');
    const cost = profileId ? costs.get(profileId) : undefined;
    out.set(p.id, cost?.reliable ? cost.unitCost : null);
  }
  return out;
}

/** Productos para el preview. Con `onlyIds` trae el stock exacto solo de esos
 *  (los de la campaña): ~35 llamadas en vez de ~100. */
export async function loadPreviewProducts(onlyIds?: number[]): Promise<PreviewProduct[]> {
  const [wcProducts, priceIndex, costs] = await Promise.all([fetchWcProducts(), fetchMayoristaPriceIndex(), fetchCostByProfile()]);
  const wanted = onlyIds ? new Set(onlyIds) : null;
  const stock = await fetchStock(wcProducts.filter(p => !wanted || wanted.has(p.id)));
  return wcProducts.map((p): PreviewProduct => {
    const idx = priceIndex.get(p.id);
    const profileId = String((p.meta_data as any[])?.find((m: any) => m.key === '_hs_cost_profile_id')?.value || '');
    const cost = profileId ? costs.get(profileId) : undefined;
    return {
      id: p.id,
      name: p.name,
      stock: stock.has(p.id) ? stock.get(p.id)! : 0,
      regularPrice: idx?.regularPrice ?? null,
      cost: cost?.unitCost ?? null,
      costReliable: !!cost?.reliable,
      wholesale: idx?.wholesale ?? false,
    };
  });
}
