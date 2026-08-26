import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET    = process.env.WP_SECRET          || '';

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId, trackingNumber } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });

  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/set-tracking`, {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'X-Hypestyle-Secret': WP_SECRET,
    },
    body: JSON.stringify({ order_id: orderId, tracking_number: trackingNumber || '' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || 'WP error' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
