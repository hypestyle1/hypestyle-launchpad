import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';

const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

// Respuesta de la tienda a una reseña. Texto vacío = borrar la respuesta.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await authorizeAdmin(req, 'reviews'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === 'string' ? body.text : '';

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews-moderation/${encodeURIComponent(params.id)}/reply`, {
    method: 'POST',
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data.message || `WP ${res.status}` }, { status: res.status });
  return NextResponse.json(data);
}
