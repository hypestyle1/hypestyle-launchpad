import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { loadSharedStock, saveSharedStock } from '@/lib/shared-stock';

export const dynamic = 'force-dynamic';

const NO_DESPLEGADA = 'No se pudo leer el stock compartido. ¿Está desplegada la ruta hypestyle/v1/shared-stock del mu-plugin (v1.28.0)?';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const snapshot = await loadSharedStock();
  if (!snapshot) return NextResponse.json({ error: NO_DESPLEGADA }, { status: 502 });
  return NextResponse.json({ snapshot });
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let pools: unknown;
  try { pools = (await req.json())?.pools; }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  if (!pools || typeof pools !== 'object' || Array.isArray(pools) || Object.keys(pools).length === 0) {
    return NextResponse.json({ error: 'Falta "pools" con al menos un color' }, { status: 400 });
  }

  // La validación fina (colores, talles, enteros >= 0) la hace el mu-plugin, que
  // es el que conoce el mapa de pilas. Acá sólo se chequea la forma.
  const res = await saveSharedStock(pools as Record<string, Record<string, number>>);
  if (!res.ok) return NextResponse.json({ error: res.error || NO_DESPLEGADA }, { status: 502 });
  return NextResponse.json({ ok: true, snapshot: res.snapshot });
}
