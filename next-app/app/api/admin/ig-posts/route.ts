import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdmin } from '@/lib/admin-auth';
import { fixtureList } from '@/lib/ig-insights/fixtures';

/**
 * Listado de publicaciones de IG para el panel (SOLO LECTURA).
 *
 * Proxy a `GET hypestyle/v1/ig-posts` del mu-plugin. Mientras el mu-plugin no
 * esté desplegado (gate B1), WP devuelve 404 y acá se sirven los DATOS DE
 * PRUEBA de lib/ig-insights/fixtures.ts con `fixture: true` — el panel lo
 * muestra como banner ámbar. Al cerrar B1 esta ruta pasa a datos reales sin
 * tocar una línea.
 */

export const dynamic = 'force-dynamic';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

const PARAMS_PERMITIDOS = [
  'productType', 'category', 'since', 'until', 'boosted', 'classified', 'search', 'limit', 'offset',
] as const;

export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const qs = new URLSearchParams();
  for (const k of PARAMS_PERMITIDOS) {
    const v = req.nextUrl.searchParams.get(k);
    if (v) qs.set(k, v);
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/hypestyle/v1/ig-posts?${qs}&_cb=${Date.now()}`, {
      headers: { 'X-Hypestyle-Secret': process.env.WP_SECRET || '' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ...data, fixture: false });
    }
    if (res.status !== 404) {
      return NextResponse.json({ error: `WP respondió ${res.status}` }, { status: 502 });
    }
  } catch {
    // WP inalcanzable: mismo tratamiento que no-desplegado, con fixtures.
  }

  const p = req.nextUrl.searchParams;
  const { rows, total } = fixtureList({
    productType: p.get('productType'),
    category: p.get('category'),
    since: p.get('since'),
    until: p.get('until'),
    boosted: p.get('boosted'),
    classified: p.get('classified'),
    search: p.get('search'),
    limit: Number(p.get('limit')) || 50,
    offset: Number(p.get('offset')) || 0,
  });
  return NextResponse.json({ rows, total, fixture: true });
}
