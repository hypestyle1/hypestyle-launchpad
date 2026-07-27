import { NextRequest, NextResponse } from 'next/server';

// Proxy server-side hacia hypestyle-reviews/v1 — el navegador nunca ve
// HS_REVIEWS_SECRET (sin prefijo NEXT_PUBLIC_, nunca se bundlea al cliente).
// Ver docs/reviews-security.md §7.
const WP_URL           = process.env.NEXT_PUBLIC_WP_URL   || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET   || '';

const TOKEN_RE = /^[a-f0-9]{64}$/;

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/reviews/${token}`, {
    headers: { 'X-HS-Reviews-Secret': HS_REVIEWS_SECRET },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
