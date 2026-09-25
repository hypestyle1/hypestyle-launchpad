// Campañas para el portal mayorista (server only). Va en lib/ y no en la
// página porque Next no admite exports extra en un page.tsx (el build lo
// rechaza, igual que en un route.ts).
//
// Si WP no responde, el catálogo sale a precio normal: el pedido igual
// recalcula y avisa si hay diferencia.
//
// ?preview=<token firmado> (lib/mayorista-preview-token.ts): muestra una
// campaña en borrador como si estuviera vigente, solo para quien tiene el
// link. No afecta los pedidos ni a los demás mayoristas.

import { readCampaigns } from './wholesale-campaigns-store';
import { verifyPreviewToken } from './mayorista-preview-token';
import type { WholesaleCampaign } from './wholesale-campaigns';

export async function loadCampaignsForPortal(previewToken?: string | null): Promise<WholesaleCampaign[]> {
  const campaigns = await readCampaigns().catch((e) => { console.error('[mayoristas] campañas:', e); return [] as WholesaleCampaign[]; });
  const previewId = verifyPreviewToken(previewToken);
  if (!previewId) return campaigns;
  const now = new Date();
  return campaigns.map(c => c.id === previewId
    ? { ...c, status: 'active' as const, startsAt: new Date(now.getTime() - 60000).toISOString(), endsAt: new Date(Math.max(new Date(c.endsAt).getTime(), now.getTime() + 3600000)).toISOString() }
    : c);
}
