// Lectura de las campañas mayoristas guardadas en WP (option
// hs_wholesale_campaigns, ruta hypestyle/v1/wholesale-campaigns). Server only.
// Vive acá y no en la ruta admin porque Next no permite exportar helpers
// desde un route.ts (el build de producción falla: "not a valid Route export
// field"); el pedido (C2) y el catálogo también la necesitan.

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
