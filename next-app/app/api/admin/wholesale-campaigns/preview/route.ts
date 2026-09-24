import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { validateCampaign, campaignPreview } from '@/lib/wholesale-campaigns';
import { loadPreviewProducts } from '@/lib/wholesale-campaign-data';

// Preview financiero de una campaña ANTES de activarla, con datos vivos de Woo:
// unidades incluidas, valor a mayorista normal, valor promo, descuento
// otorgado, COGS conocido, margen conocido, COST_UNKNOWN, RISK y CRITICAL (los
// CRITICAL sin `acceptCritical` aparecen en `activationBlockers`).
//
//   POST { campaign } → { preview, campaign }   (400 con problems si no valida)

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json().catch(() => null) as { campaign?: unknown } | null;
  const v = validateCampaign(body?.campaign);
  if (!v.campaign) return NextResponse.json({ error: 'Campaña inválida', problems: v.problems }, { status: 400 });
  try {
    const products = await loadPreviewProducts();
    return NextResponse.json({ campaign: v.campaign, preview: campaignPreview(v.campaign, products), productsLoaded: products.length });
  } catch (err) {
    console.error('[wholesale-campaigns/preview]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error leyendo Woo' }, { status: 502 });
  }
}
