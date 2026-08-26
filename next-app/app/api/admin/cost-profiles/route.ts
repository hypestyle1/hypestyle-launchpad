import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET          || '';

function checkAuth(req: NextRequest) {
  return adminSecretMatches(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // El `_cb` no es paranoia: la CDN de Hostinger cachea esta respuesta por URL exacta y
  // devuelve la foto vieja de los perfiles aunque `cache: 'no-store'` evite el cache de Next.
  // Es el mismo recurso que ya usa /api/admin/product-costs.
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/cost-profiles?_cb=${Date.now()}`, {
    headers: { 'X-Hypestyle-Secret': WP_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: 'WP error' }, { status: 502 });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/cost-profiles`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || 'WP error' }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}
