import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchFxRates } from '@/lib/fx';
import { aggregateOperating } from '@/lib/finance/operating-costs';
import { fetchOperatingCosts } from '@/lib/finance/operating-costs-fetch';
import { arDateRange } from '@/lib/dashboard/periods';

// Agregación server-side: no manda todos los CostItems al browser para sumar en
// React. Trae costos (option o defaults) + FX (cacheado 1h en lib/fx) y devuelve
// el summary ya prorrateado y convertido a ARS para el DateRange.

function checkAuth(req: NextRequest) { return adminSecretMatches(req.headers.get('x-admin-key')); }

// El DateRange llega como instantes AR en UTC con fin EXCLUSIVO; costForRange
// trabaja con días de calendario inclusivos. arDateRange hace esa conversión.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start y end requeridos' }, { status: 400 });

  try {
    const [{ costs, persisted }, fx] = await Promise.all([fetchOperatingCosts(), fetchFxRates()]);
    const { since, until } = arDateRange(start, end);
    const summary = aggregateOperating(costs, since, until, fx);
    return NextResponse.json({ summary, persisted, lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: 'No se pudo calcular Operating Costs', detail: String(e?.message || e) }, { status: 502 });
  }
}
