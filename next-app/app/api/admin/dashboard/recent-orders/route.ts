import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = (process.env.WC_CONSUMER_KEY || '').trim();
const WC_SEC = (process.env.WC_CONSUMER_SECRET || '').trim();
const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const limit = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '8')));

  try {
    const costMap = await getCostMap();

    const params = new URLSearchParams({
      per_page: String(limit),
      page: '1',
      orderby: 'date',
      order: 'desc',
      _fields: 'id,number,status,date_created_gmt,total,refunds,line_items,billing',
      _cb: String(Date.now()),
    });
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${params}`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: `WC ${res.status}` }, { status: 502 });
    const raw = (await res.json()) as any[];

    const orders = raw.map((o) => {
      const total = parseFloat(o.total) || 0;
      const refunded = Array.isArray(o.refunds)
        ? o.refunds.reduce((s: number, r: any) => s + Math.abs(Number(r.total) || 0), 0)
        : 0;
      const net = total - refunded;

      // Profit sólo si TODOS los productos del pedido tienen costo configurado.
      // Si falta uno, no se muestra un número poco fiable: se devuelve null.
      let cogs = 0;
      let profitReliable = true;
      for (const li of (o.line_items as any[] || [])) {
        const unit = costMap.costOf(Number(li.product_id));
        if (unit === undefined) { profitReliable = false; break; }
        cogs += unit * (Number(li.quantity) || 0);
      }

      return {
        id: o.id,
        number: String(o.number ?? o.id),
        date: o.date_created_gmt ? new Date(`${o.date_created_gmt}Z`).toISOString() : null,
        customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim(),
        status: o.status,
        total,
        net: Math.round(net * 100) / 100,
        profit: profitReliable ? Math.round((net - cogs) * 100) / 100 : null,
      };
    });

    return NextResponse.json({ orders });
  } catch (e: any) {
    console.error('[dashboard/recent-orders]', e?.message || e);
    return NextResponse.json({ error: 'No se pudieron traer los pedidos' }, { status: 502 });
  }
}
