import { NextRequest, NextResponse } from 'next/server';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const ADMIN_SECRET       = process.env.WP_SECRET          || '';
const HS_REVIEWS_SECRET  = process.env.HS_REVIEWS_SECRET  || '';

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (ADMIN_SECRET && key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews/undo-dispatch/${orderId}`, {
    method: 'POST',
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || `WP ${res.status}` }, { status: res.status });
  return NextResponse.json(data);
}
