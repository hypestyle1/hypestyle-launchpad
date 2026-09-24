import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { validateCampaign, effectiveStatus, overlappingProducts, type WholesaleCampaign } from '@/lib/wholesale-campaigns';
import { readCampaigns } from '@/lib/wholesale-campaigns-store';

// Campañas mayoristas: lista y upsert. La option vive en WP
// (hs_wholesale_campaigns, PHP 1.38.0); acá se valida con la misma lib que
// usa el pedido y se agrega el estado efectivo (draft / scheduled / active /
// ended) que ve el admin.
//
//   GET                       → { campaigns: [...con effectiveStatus], overlaps }
//   POST { campaigns: [raw], deleteIds?: [] } → { campaigns }  (400 con problems si algo no valida)

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';

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

  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/wholesale-campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET },
    body: JSON.stringify({ campaigns, deleteIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || 'WP error' }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json(decorate(Array.isArray(data?.campaigns) ? data.campaigns : []));
}
