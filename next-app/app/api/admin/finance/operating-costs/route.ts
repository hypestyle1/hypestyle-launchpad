import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchOperatingCosts } from '@/lib/finance/operating-costs-fetch';

// Persistencia: option `hs_operating_costs` en WP (ruta hypestyle/v1/operating-costs).
// GET cae a los DEFAULTS confirmados si la option está vacía (ver el lib de fetch).
// POST persiste el array completo.

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';

function checkAuth(req: NextRequest) { return adminSecretMatches(req.headers.get('x-admin-key')); }

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { costs, persisted } = await fetchOperatingCosts();
  return NextResponse.json({ costs, persisted });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json();
  const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/operating-costs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hypestyle-Secret': WP_SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // 404 = ruta PHP todavía no desplegada.
    const hint = res.status === 404 ? 'El backend de Operating Costs (PHP 1.23.0) todavía no está desplegado.' : undefined;
    return NextResponse.json({ error: err.message || 'WP error', hint }, { status: res.status === 404 ? 501 : 502 });
  }
  return NextResponse.json(await res.json());
}
