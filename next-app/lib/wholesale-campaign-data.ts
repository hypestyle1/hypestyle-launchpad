// Datos para el preview financiero de una campaña mayorista (server only).
//
// Junta tres fuentes que ya existen, sin duplicar nada:
//  - WC REST: productos publicados con su perfil de costo (`_hs_cost_profile_id`).
//  - WPGraphQL (lib/mayorista-products.ts): PVP real por producto, pertenencia
//    al catálogo mayorista y stock por talle (el regular_price y el stock de
//    un variable viven en las variaciones, que REST no trae en el listado).
//  - Perfiles de costo (option hs_cost_profiles) para el COGS y su confiabilidad.

import { fetchMayoristaPriceIndex, fetchMayoristaProducts } from './mayorista-products';
import { normalizeProfiles, isConfigured, hasIncompleteComponent } from './cost-profiles';
import { costProfileLooksProvisional } from './wholesale-margin-risk';
import type { PreviewProduct } from './wholesale-campaigns';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const WP_SECRET = process.env.WP_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function fetchWcProducts(): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products?status=publish&per_page=100&page=${page}&_fields=id,name,slug,type,stock_status,stock_quantity,manage_stock,meta_data&_cb=${Date.now()}`, {
      headers: { Authorization: wcAuth() }, cache: 'no-store',
    });
    if (!res.ok) throw new Error(`WC ${res.status} listando productos`);
    const data = (await res.json()) as any[];
    all.push(...data);
    if (data.length < 100) break;
  }
  return all;
}

async function fetchCostByProfile(): Promise<Map<string, { unitCost: number; reliable: boolean }>> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/cost-profiles?_cb=${Date.now()}`, { headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store' });
  if (!res.ok) throw new Error(`WP ${res.status} leyendo cost-profiles`);
  const profiles = normalizeProfiles(await res.json());
  return new Map(profiles.map(p => [p.id, { unitCost: p.unitCost, reliable: isConfigured(p) && !hasIncompleteComponent(p) && !costProfileLooksProvisional(p.name) }]));
}

export async function loadPreviewProducts(): Promise<PreviewProduct[]> {
  const [wc, priceIndex, catalog, costs] = await Promise.all([fetchWcProducts(), fetchMayoristaPriceIndex(), fetchMayoristaProducts(), fetchCostByProfile()]);
  // Stock por producto desde el catálogo mayorista (suma de talles; null si
  // algún talle no gestiona stock). Lo que no está en el catálogo (agotado o
  // excluido) queda en 0 unidades.
  const stockBySlug = new Map<string, number | null>();
  for (const p of catalog) {
    const qtys = Object.values(p.stockQty ?? {});
    stockBySlug.set(p.slug, qtys.some(q => q == null) ? null : qtys.reduce((s, q) => s + Math.max(0, q as number), 0));
  }
  return wc.map((p): PreviewProduct => {
    const idx = priceIndex.get(p.id);
    const profileId = String((p.meta_data as any[])?.find((m: any) => m.key === '_hs_cost_profile_id')?.value || '');
    const cost = profileId ? costs.get(profileId) : undefined;
    const managed = p.type === 'variable' ? stockBySlug.get(p.slug) : (p.manage_stock ? Math.max(0, Number(p.stock_quantity) || 0) : null);
    return {
      id: p.id,
      name: p.name,
      stock: managed === undefined ? 0 : managed,
      regularPrice: idx?.regularPrice ?? null,
      cost: cost?.unitCost ?? null,
      costReliable: !!cost?.reliable,
      wholesale: idx?.wholesale ?? false,
    };
  });
}
