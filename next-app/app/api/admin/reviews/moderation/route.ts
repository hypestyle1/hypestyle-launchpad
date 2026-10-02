import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

// Filtros del panel de moderación — se reenvían tal cual al plugin
// (hypestyle-reviews/v1/reviews-moderation), que es quien los valida.
const PASSTHROUGH_PARAMS = ['status', 'stars', 'search', 'photos', 'period', 'sort', 'product_id', 'page', 'per_page'];

export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'reviews'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const incoming = req.nextUrl.searchParams;
  const params = new URLSearchParams();
  for (const p of PASSTHROUGH_PARAMS) {
    const v = incoming.get(p);
    if (v) params.set(p, v);
  }

  // _cb: LiteSpeed en Hostinger cachea por URL exacta y guardó el 404 de antes de
  // instalar el plugin; mismo patrón que el resto de los proxies admin.
  params.set('_cb', String(Date.now()));
  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews-moderation?${params}`, {
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || `WP ${res.status}` }, { status: res.status });
  return NextResponse.json(data);
}
