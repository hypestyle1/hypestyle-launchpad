import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?customer=${customerId}&status=any&per_page=50&orderby=date&order=desc&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.json({ message: 'No se pudieron cargar los pedidos' }, { status: 502 });

  const orders = await res.json() as any[];
  const tracking = (o: any) =>
    (o.meta_data as any[])?.find((m: any) => m.key === '_tracking_number')?.value || '';

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      date: o.date_created,
      status: o.status,
      total: parseFloat(o.total),
      itemCount: (o.line_items as any[]).reduce((sum: number, li: any) => sum + li.quantity, 0),
      items: (o.line_items as any[]).map((li: any) => li.name),
      tracking: tracking(o),
    })),
  });
}
