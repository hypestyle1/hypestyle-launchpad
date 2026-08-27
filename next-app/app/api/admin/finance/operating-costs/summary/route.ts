import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchFxRates } from '@/lib/fx';
import { aggregateOperating } from '@/lib/finance/operating-costs';
import { fetchOperatingCosts } from '@/lib/finance/operating-costs-fetch';

// Agregación server-side: no manda todos los CostItems al browser para sumar en
// React. Trae costos (option o defaults) + FX (cacheado 1h en lib/fx) y devuelve
// el summary ya prorrateado y convertido a ARS para el DateRange.

const AR_OFFSET_MS = 180 * 60_000; // Argentina = UTC−3

function checkAuth(req: NextRequest) { return adminSecretMatches(req.headers.get('x-admin-key')); }

/** Fecha de CALENDARIO AR (YYYY-MM-DD) desde un instante UTC. El DateRange llega
 *  como límites AR en UTC (fin de día AR = 03:00 UTC del día siguiente); cortar
 *  la fecha directo en UTC contaría un día de más. Restamos el offset AR primero. */
function arDate(iso: string): string {
  return new Date(Date.parse(iso) - AR_OFFSET_MS).toISOString().slice(0, 10);
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start y end requeridos' }, { status: 400 });

  try {
    const [{ costs, persisted }, fx] = await Promise.all([fetchOperatingCosts(), fetchFxRates()]);
    const summary = aggregateOperating(costs, arDate(start), arDate(end), fx);
    return NextResponse.json({ summary, persisted, lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: 'No se pudo calcular Operating Costs', detail: String(e?.message || e) }, { status: 502 });
  }
}
