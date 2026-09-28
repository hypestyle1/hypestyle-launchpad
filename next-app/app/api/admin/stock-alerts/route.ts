import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { loadStockAlerts, markStockAlerts, deleteStockAlert } from '@/lib/stock-alerts';

export const dynamic = 'force-dynamic';

const NO_DESPLEGADA = 'No se pudieron leer los avisos. ¿Está subido el mu-plugin hypestyle-stock-alerts.php (v1.0.0)?';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const status = req.nextUrl.searchParams.get('status');
  const snapshot = await loadStockAlerts(status === 'notified' || status === 'all' ? status : 'pending');
  if (!snapshot) return NextResponse.json({ error: NO_DESPLEGADA }, { status: 502 });
  return NextResponse.json({ snapshot });
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  if (body?.action === 'delete') {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });
    const res = await deleteStockAlert(id);
    if (!res.ok) return NextResponse.json({ error: res.data?.message || NO_DESPLEGADA }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === 'mark') {
    const status = body.status === 'pending' ? 'pending' : 'notified';
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const size = typeof body.size === 'string' ? body.size : '';
    if (!slug || !size) return NextResponse.json({ error: 'Faltan producto y talle' }, { status: 400 });
    const res = await markStockAlerts({ slug, size }, status);
    if (!res.ok) return NextResponse.json({ error: res.data?.message || NO_DESPLEGADA }, { status: 502 });
    return NextResponse.json({ ok: true, updated: res.data?.updated ?? 0 });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}
