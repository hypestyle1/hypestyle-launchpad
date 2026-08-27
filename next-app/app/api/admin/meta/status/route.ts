import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getMetaConnection } from '@/lib/meta/connection';

// Estado de conexión de Meta — liviano (sólo token + cuenta, cacheado). Lo usan
// Inicio, Ads y Configuración para saber si Meta está conectado SIN disparar el
// summary pesado. El token nunca sale del server.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const conn = await getMetaConnection(force);
  return NextResponse.json(conn);
}
