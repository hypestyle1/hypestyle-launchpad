import { NextRequest, NextResponse } from 'next/server';

// Proxy server-side hacia hypestyle-reviews/v1/.../submit — mismo patrón que
// app/api/reviews/[token]/route.ts. El navegador nunca ve HS_REVIEWS_SECRET.
const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

const TOKEN_RE = /^[a-f0-9]{64}$/;

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const reviews = Array.isArray(body?.reviews) ? body.reviews : [];

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews/${token}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HS-Reviews-Secret': HS_REVIEWS_SECRET,
    },
    body: JSON.stringify({ reviews }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
