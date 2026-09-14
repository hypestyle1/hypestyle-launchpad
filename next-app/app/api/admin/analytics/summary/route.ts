import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { ga4Configured, ga4PropertyId, batchRunReportsCached, runRealtimeActiveUsers } from '@/lib/ga4/client';
import { buildReportRequests, parseReports, fillDaily } from '@/lib/ga4/reports';
import { joinMetaWithGa } from '@/lib/ga4/join';
import type { AnalyticsSummaryResponse } from '@/lib/ga4/summary';
import { getMetaData, metaConfigured } from '@/lib/meta/client';
import { arDateRange } from '@/lib/dashboard/periods';

// Resumen de tráfico (GA4) cruzado con la pauta (Meta) para el mismo rango.
// GA4 se lee en dos batches cacheados 10 min; el realtime va siempre fresco
// (es "ahora"). Meta reusa el cliente y el cache que ya usa /admin/ads. Si Meta
// no está conectado el cruce va vacío, pero el tráfico se muestra igual.
//
// La propiedad de GA4 y la cuenta de Meta están en hora argentina: el rango
// del panel se convierte a fechas AR-local inclusivas con arDateRange (fin
// exclusivo si son instantes, tal cual si son YYYY-MM-DD).

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!ga4Configured()) {
    return NextResponse.json({ connected: false, reason: 'not_configured', propertyId: ga4PropertyId() } satisfies AnalyticsSummaryResponse);
  }

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start y end requeridos' }, { status: 400 });
  const { since, until } = arDateRange(start, end);
  const force = req.nextUrl.searchParams.get('refresh') === '1';

  try {
    const [reports, realtimeUsers, meta] = await Promise.all([
      batchRunReportsCached(buildReportRequests(since, until), force),
      runRealtimeActiveUsers().catch(() => null),
      metaConfigured() ? getMetaData(since, until, force).catch(() => null) : Promise.resolve(null),
    ]);
    const report = parseReports(reports);
    report.daily = fillDaily(report.daily, since, until);
    const pauta = meta ? joinMetaWithGa(meta.campaigns, report.campaigns) : null;

    return NextResponse.json({
      connected: true, propertyId: ga4PropertyId(), range: { since, until },
      report, realtimeUsers, pauta, metaConnected: !!meta,
      lastUpdated: new Date().toISOString(),
    } satisfies AnalyticsSummaryResponse);
  } catch (e: any) {
    return NextResponse.json({ connected: true, error: 'No pudimos consultar Google Analytics', detail: String(e?.message || e) } satisfies AnalyticsSummaryResponse, { status: 502 });
  }
}
