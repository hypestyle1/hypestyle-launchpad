import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchChildInsights, metaConfigured } from '@/lib/meta/client';
import { metaCpa } from '@/lib/meta/metrics';

// Drilldown de UNA campaña → ad sets o ads. On-demand (no en el load de la página).

export const dynamic = 'force-dynamic';
const AR_OFFSET_MS = 180 * 60_000;
const arDate = (iso: string) => new Date(Date.parse(iso) - AR_OFFSET_MS).toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (!metaConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const campaignId = searchParams.get('campaignId');
  const level = (searchParams.get('level') || 'adset') as 'adset' | 'ad';
  const start = searchParams.get('start'), end = searchParams.get('end');
  if (!campaignId || !start || !end) return NextResponse.json({ error: 'campaignId, start, end requeridos' }, { status: 400 });

  try {
    const rows = await fetchChildInsights(level, campaignId, arDate(start), arDate(end));
    const enriched = rows.map((r) => ({ ...r, cpa: metaCpa(r.spend, r.purchases) })).sort((a, b) => b.spend - a.spend);
    return NextResponse.json({ rows: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: 'No pudimos consultar Meta', detail: String(e?.message || e) }, { status: 502 });
  }
}
