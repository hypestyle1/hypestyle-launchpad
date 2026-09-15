import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { runBrief } from '@/lib/brief/run';

// Founder Brief ("Hoy"): compone señales sobre datos que ya producen los
// providers existentes. Nunca escribe. Si un provider falla, responde igual
// con ese dominio en `degraded`. `?debug=1` agrega todas las señales
// puntuadas antes del recorte, para revisar el scoring.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const debug = req.nextUrl.searchParams.get('debug') === '1';
  try {
    const brief = await runBrief({ debug });
    return NextResponse.json(brief);
  } catch (e: any) {
    console.error('[dashboard/brief]', e?.message || e);
    return NextResponse.json({ error: 'No se pudo armar el brief' }, { status: 502 });
  }
}
