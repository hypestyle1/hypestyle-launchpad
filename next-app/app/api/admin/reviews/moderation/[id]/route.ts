import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

const ACTIONS = new Set(['approve', 'reject', 'pending']);

// Publicar / rechazar / volver a pendiente una reseña.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authorizeAdmin(req, 'reviews'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === 'string' ? body.action : '';
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  }

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews-moderation/${encodeURIComponent(params.id)}`, {
    method: 'POST',
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || `WP ${res.status}` }, { status: res.status });
  return NextResponse.json(data);
}
