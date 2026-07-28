import { NextRequest, NextResponse } from 'next/server';

// Proxy público (sin secretos) hacia el futuro endpoint de WordPress
// GET /wp-json/hypestyle/v1/public-reviews — reseñas aprobadas, publicables,
// sin datos personales/internos (ver docs/reviews-api.md, sección de reseñas
// públicas). Ese endpoint todavía no está implementado en el plugin: mientras
// no exista, este proxy responde con un resultado vacío controlado (nunca
// inventa promedio ni cantidad) en vez de propagar un error al frontend.
const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

const EMPTY_RESPONSE = {
  summary: { average: null, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
  reviews: [],
  pagination: { page: 1, pages: 0, total: 0 },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const key of ['page', 'per_page', 'stars', 'sort']) {
    const v = searchParams.get(key);
    if (v) qs.set(key, v);
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/public-reviews?${qs.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(EMPTY_RESPONSE, { status: 200 });
    }
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.reviews)) {
      return NextResponse.json(EMPTY_RESPONSE, { status: 200 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(EMPTY_RESPONSE, { status: 200 });
  }
}
