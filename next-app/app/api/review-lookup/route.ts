import { NextRequest, NextResponse } from 'next/server';

// Proxy server-side hacia hypestyle-reviews/v1/review-lookup — mismo patrón
// que app/api/reviews/[token]/route.ts: el navegador nunca ve
// HS_REVIEWS_SECRET. Autoservicio: el cliente entra con número de pedido +
// mail y recibe un token que abre el mismo formulario que llega por email.
const WP_URL            = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const HS_REVIEWS_SECRET = process.env.HS_REVIEWS_SECRET  || '';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const orderNumber =
    typeof body?.order_number === 'string' || typeof body?.order_number === 'number'
      ? String(body.order_number)
      : '';
  const email = typeof body?.email === 'string' ? body.email : '';

  const res = await fetch(`${WP_URL}/wp-json/hypestyle-reviews/v1/review-lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HS-Reviews-Secret': HS_REVIEWS_SECRET,
    },
    body: JSON.stringify({ order_number: orderNumber, email }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
