import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { loadStore, upsertEntries } from '@/lib/close-friends/store';
import { collectFromWoo } from '@/lib/close-friends/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = (process.env.CRON_SECRET || '').trim();

/**
 * Lee los pedidos pagados de Woo desde el último sync (con solapamiento)
 * y suma a la lista los usuarios de IG que no estaban. Devuelve el delta.
 *
 *   POST (panel, botón de sync)       authorizeAdmin(req, 'creadores')
 *   GET  (Vercel Cron diario)         CRON_SECRET
 */
async function run() {
  const current = await loadStore();
  if (current.ok === false) {
    if (current.notDeployed) return NextResponse.json({ error: 'Backend no desplegado (PHP 1.31.0)' }, { status: 501 });
    return NextResponse.json({ error: current.error || 'No se pudo leer la lista' }, { status: 502 });
  }

  const now = new Date();
  let collected;
  try {
    collected = await collectFromWoo(current.data.lastSyncAt, now);
  } catch (e: any) {
    return NextResponse.json({ error: `Woo no respondió: ${e?.message || 'error'}` }, { status: 502 });
  }

  // Si alguna página falló no se mueve lastSyncAt: el próximo sync vuelve a mirar la misma ventana.
  const r = await upsertEntries(collected.entries, collected.truncated ? undefined : now.toISOString());
  if (r.ok === false) return NextResponse.json({ error: r.error || 'No se pudo guardar' }, { status: 502 });

  const known = new Set(current.data.entries.map((e) => (e.status === 'revisar' ? `revisar:${e.source}:${e.orderNumber}` : e.handle)));
  const nuevos = collected.entries.filter((e) => !known.has(e.status === 'revisar' ? `revisar:${e.source}:${e.orderNumber}` : e.handle));

  return NextResponse.json({
    ok: true,
    orders: collected.orders,
    candidates: collected.entries.length,
    added: r.data.added,
    total: r.data.total,
    truncated: collected.truncated,
    nuevos: nuevos.map((e) => ({ handle: e.handle, name: e.name, orderNumber: e.orderNumber, date: e.date, status: e.status })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return run();
}

/** Corrida diaria (Vercel Cron). Acepta ?secret=, x-cron-secret o el Bearer de Vercel. */
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET cargado el endpoint no se abre solo.
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return run();
}
