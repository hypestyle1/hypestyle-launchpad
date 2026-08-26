import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

// Filtros que soporta el panel /admin/reviews — se reenvían tal cual a
// hypestyle-reviews/v1/review-requests (la validación real vive ahí).
const PASSTHROUGH_PARAMS = [
  'status', 'search', 'page', 'per_page',
  'dispatched_from', 'dispatched_to',
  'sent_from', 'sent_to',
  'has_response', 'has_coupon',
];

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const incoming = req.nextUrl.searchParams;
  const params = new URLSearchParams();
  for (const p of PASSTHROUGH_PARAMS) {
    const v = incoming.get(p);
    if (v) params.set(p, v);
  }

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/review-requests?${params}`, {
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
