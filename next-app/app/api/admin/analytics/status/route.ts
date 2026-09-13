import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getGa4Connection } from '@/lib/ga4/connection';

// Estado de conexión de GA4 — liviano (credenciales + propiedad). Lo usan
// Inicio, Tráfico e Integraciones sin disparar el resumen pesado.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  return NextResponse.json(await getGa4Connection(force));
}
