import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { validateCampaign, effectiveStatus, overlappingProducts, campaignPreview, type WholesaleCampaign } from '@/lib/wholesale-campaigns';
import { readCampaigns, writeCampaigns } from '@/lib/wholesale-campaigns-store';
import { loadPreviewProducts } from '@/lib/wholesale-campaign-data';

// Campañas mayoristas: lista y upsert. La option vive en WP
// (hs_wholesale_campaigns, PHP 1.38.0); acá se valida con la misma lib que
// usa el pedido y se agrega el estado efectivo (draft / scheduled / active /
// ended) que ve el admin.
//
//   GET                       → { campaigns: [...con effectiveStatus], overlaps }
//   POST { campaigns: [raw], deleteIds?: [] } → { campaigns }
//     400 con problems si algo no valida.
//     409 con blockers si se intenta ACTIVAR con productos CRITICAL sin
//     confirmación: el gate corre el preview financiero con Woo en vivo y,
//     si pasa, deja en history la foto de stock de ese momento (para medir
//     "stock liquidado").

export const maxDuration = 60;

function checkAuth(req: NextRequest) { return adminSecretMatches(req.headers.get('x-admin-key')); }

function decorate(list: WholesaleCampaign[]) {
  const now = Date.now();
  return { campaigns: list.map(c => ({ ...c, effectiveStatus: effectiveStatus(c, now) })), overlaps: overlappingProducts(list, now) };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    return NextResponse.json(decorate(await readCampaigns()));
  } catch (err) {
    console.error('[wholesale-campaigns] GET', err);
    return NextResponse.json({ error: 'WP error' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json().catch(() => null) as { campaigns?: unknown[]; deleteIds?: string[] } | null;
  const raws = Array.isArray(body?.campaigns) ? body!.campaigns : [];
  const deleteIds = Array.isArray(body?.deleteIds) ? body!.deleteIds.map(String) : [];
  if (!raws.length && !deleteIds.length) return NextResponse.json({ error: 'Falta campaigns o deleteIds' }, { status: 400 });

  const campaigns: WholesaleCampaign[] = [];
  const problems: { id: string; problems: { field: string; message: string }[] }[] = [];
  for (const raw of raws) {
    const v = validateCampaign(raw);
    if (v.campaign) campaigns.push(v.campaign); else problems.push({ id: String((raw as any)?.id ?? '?'), problems: v.problems });
  }
  if (problems.length) return NextResponse.json({ error: 'Campaña inválida', problems }, { status: 400 });

  try {
    // Gate de activación: solo cuando una campaña pasa a `active`.
    let current: WholesaleCampaign[] | null = null;
    for (const c of campaigns) {
      if (c.status !== 'active') continue;
      current ??= await readCampaigns();
      const prev = current.find(x => x.id === c.id);
      if (prev?.status === 'active') continue;
      const products = await loadPreviewProducts(c.items.map(i => i.productId));
      const preview = campaignPreview(c, products);
      if (preview.activationBlockers.length) {
        return NextResponse.json({ error: 'No se puede activar: productos CRITICAL sin confirmación', blockers: preview.activationBlockers, critical: preview.critical }, { status: 409 });
      }
      const at = new Date().toISOString();
      const stockSnapshot: Record<string, number | null> = {};
      for (const r of preview.rows) stockSnapshot[String(r.productId)] = r.stock;
      c.history = [...c.history, { at, from: prev?.status ?? 'draft', to: 'active', by: 'admin', note: 'stockSnapshot', ...({ stockSnapshot } as object) } as any];
    }
    const saved = await writeCampaigns(campaigns, deleteIds);
    return NextResponse.json(decorate(saved));
  } catch (err) {
    console.error('[wholesale-campaigns] POST', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'WP error' }, { status: 502 });
  }
}
