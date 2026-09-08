import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { loadStore } from '@/lib/close-friends/store';

export const dynamic = 'force-dynamic';

/** GET: la lista completa (entradas + último sync). */
export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const r = await loadStore();
  if (r.ok === false) {
    if (r.notDeployed) return NextResponse.json({ entries: [], lastSyncAt: null, updatedAt: null, notDeployed: true });
    return NextResponse.json({ error: r.error || 'No se pudo leer la lista' }, { status: 502 });
  }
  return NextResponse.json(r.data);
}
