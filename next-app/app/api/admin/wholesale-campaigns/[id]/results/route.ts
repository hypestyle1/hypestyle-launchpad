import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { campaignResults } from '@/lib/wholesale-campaign-results';
import { readCampaigns } from '@/lib/wholesale-campaigns-store';
import { loadCostIndex } from '@/lib/wholesale-campaign-data';

// Resultados de una campaña, en vivo desde las órdenes de Woo.
//   GET /api/admin/wholesale-campaigns/:id/results
// Trae las órdenes mayoristas desde un año antes del inicio de la campaña
// (para first-time y reactivados) y las agrega con lib/wholesale-campaign-results.

export const maxDuration = 60;

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';
const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

async function fetchWholesaleOrders(after: string): Promise<any[]> {
  const all: any[] = [];
  // En serie: WP tira 500 con fan-out.
  for (let page = 1; page <= 40; page++) {
    const params = new URLSearchParams({ per_page: '100', page: String(page), status: 'any', after, orderby: 'date', order: 'desc', _fields: 'id,number,status,date_created,date_paid,customer_id,total,meta_data,line_items', _cb: `${Date.now()}-${page}` });
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, { headers: { Authorization: wcAuth() }, cache: 'no-store' });
    if (!res.ok) throw new Error(`WC ${res.status} leyendo órdenes`);
    const batch = await res.json() as any[];
    all.push(...batch.filter(o => (o.meta_data ?? []).some((m: any) => m.key === '_es_mayorista')));
    if (batch.length < 100) break;
  }
  return all;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const id = params.id;
  try {
    const campaign = (await readCampaigns()).find(c => c.id === id);
    if (!campaign) return NextResponse.json({ error: 'Campaña inexistente' }, { status: 404 });
    const after = new Date(new Date(campaign.startsAt).getTime() - 365 * 86400000).toISOString();
    const [orders, costs] = await Promise.all([fetchWholesaleOrders(after), loadCostIndex()]);
    const results = campaignResults(id, orders, costs);
    const snapshotEntry = [...campaign.history].reverse().find((h: any) => h?.stockSnapshot) as any;
    return NextResponse.json({ campaign: { id: campaign.id, name: campaign.name, status: campaign.status, startsAt: campaign.startsAt, endsAt: campaign.endsAt, activatedAt: campaign.activatedAt ?? null }, results, stockSnapshot: snapshotEntry?.stockSnapshot ?? null, ordersScanned: orders.length });
  } catch (err) {
    console.error('[wholesale-campaigns/results]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 502 });
  }
}
