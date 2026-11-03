import { NextRequest, NextResponse } from 'next/server';

// Proxy del link personal de referidos para la página de confirmación.
// El PHP autentica por order_key (mismo criterio que /gift-card-codes).

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const order = req.nextUrl.searchParams.get('order') || '';
  const key = req.nextUrl.searchParams.get('key') || '';
  if (!/^\d+$/.test(order) || !key) return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });

  try {
    const r = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/referral-link?order=${order}&key=${encodeURIComponent(key)}`,
      { cache: 'no-store' },
    );
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ error: 'Sin conexión con el servidor' }, { status: 502 });
  }
}
