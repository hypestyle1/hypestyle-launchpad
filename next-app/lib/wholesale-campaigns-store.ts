// Lectura y escritura de las campañas mayoristas guardadas en WP (option
// hs_wholesale_campaigns, ruta hypestyle/v1/wholesale-campaigns). Server only.
// Vive acá y no en la ruta admin porque Next no permite exportar helpers
// desde un route.ts (el build de producción falla: "not a valid Route export
// field"); el pedido (C2), el catálogo y el cron de expiración la necesitan.

import type { WholesaleCampaign } from './wholesale-campaigns';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';

export async function readCampaigns(): Promise<WholesaleCampaign[]> {
  // _cb: la CDN de Hostinger cachea los GET por URL exacta.
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/wholesale-campaigns?_cb=${Date.now()}`, {
    headers: { 'X-Hypestyle-Secret': WP_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`WP ${res.status} leyendo campañas`);
  const data = await res.json();
  return Array.isArray(data?.campaigns) ? data.campaigns : [];
}

/** Upsert por id (+ borrados). El PHP conserva lo que no se manda. Devuelve la lista completa. */
export async function writeCampaigns(campaigns: WholesaleCampaign[], deleteIds: string[] = []): Promise<WholesaleCampaign[]> {
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/wholesale-campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET },
    body: JSON.stringify({ campaigns, deleteIds }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `WP ${res.status} guardando campañas`);
  }
  const data = await res.json();
  return Array.isArray(data?.campaigns) ? data.campaigns : [];
}
