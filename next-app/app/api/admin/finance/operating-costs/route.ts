import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { DEFAULT_OPERATING_COSTS } from '@/lib/finance/operating-costs-defaults';
import type { OperatingCost } from '@/lib/finance/operating-costs';

// Persistencia: option `hs_operating_costs` en WP (ruta hypestyle/v1/operating-costs,
// pendiente de deploy PHP 1.23.0). Mientras la ruta no exista, GET cae a los
// DEFAULTS confirmados — así la página funciona sin romper y en producción muestra
// n8n/Upstash desde el día uno. POST requiere la ruta (gate PHP).

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WP_SECRET = process.env.WP_SECRET || '';

function checkAuth(req: NextRequest) { return adminSecretMatches(req.headers.get('x-admin-key')); }

export const dynamic = 'force-dynamic';

/** Trae los costos guardados; si la option está vacía o la ruta no existe, defaults. */
export async function fetchOperatingCosts(): Promise<{ costs: OperatingCost[]; persisted: boolean }> {
  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/operating-costs?_cb=${Date.now()}`, {
      headers: { 'X-Hypestyle-Secret': WP_SECRET }, cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const costs = Array.isArray(data.costs) ? data.costs : [];
      if (costs.length) return { costs, persisted: true };
    }
  } catch { /* cae a defaults */ }
  return { costs: DEFAULT_OPERATING_COSTS, persisted: false };
}

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
