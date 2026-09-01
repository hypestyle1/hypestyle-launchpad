import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { fetchFinanceOrders } from '@/lib/finance/fetch-orders';
import { loadFinanceConfig } from '@/lib/finance/load-config';
import { computeOrderProfit, aggregateFinance, type OrderProfit } from '@/lib/finance/calculations';
import { aggregateByGateway, feeCoverageBreakdown, type OrderFeeRow } from '@/lib/finance/fees';
import { previousRange, granularityFor, bucketKey, emptyBuckets, type Range } from '@/lib/dashboard/periods';

export const dynamic = 'force-dynamic';
// Agrega varias paginas de pedidos de Woo: el default de la plataforma queda corto.
export const maxDuration = 60;

function parseRange(sp: URLSearchParams): Range | null {
  const start = sp.get('start'), end = sp.get('end');
  if (!start || !end) return null;
  const s = Date.parse(start), e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s || e - s > 400 * 24 * 3600_000) return null;
  return { startUTC: new Date(s).toISOString(), endUTC: new Date(e).toISOString() };
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const range = parseRange(req.nextUrl.searchParams);
  if (!range) return NextResponse.json({ error: 'Rango inválido' }, { status: 400 });
  const wantCompare = req.nextUrl.searchParams.get('compare') === '1';

  try {
    const [cfg, costMap] = await Promise.all([loadFinanceConfig(), getCostMap()]);
    const costOf = costMap.costOf;

    const [cur, prev] = await Promise.all([
      fetchFinanceOrders(range.startUTC, range.endUTC),
      wantCompare ? fetchFinanceOrders(previousRange(range).startUTC, previousRange(range).endUTC) : Promise.resolve(null),
    ]);

    const profits: OrderProfit[] = cur.orders.map((o) => computeOrderProfit(o, costOf, cfg));
    const summary = aggregateFinance(profits);
    const previous = prev ? aggregateFinance(prev.orders.map((o) => computeOrderProfit(o, costOf, cfg))) : null;

    // Breakdown por pasarela.
    const feeRows: OrderFeeRow[] = profits.map((p) => ({ gross: p.grossCollected, fee: p.fee }));
    const gateways = aggregateByGateway(feeRows);

    // Timeseries (revenue / grossProfit / contributionProfit por bucket).
    const g = granularityFor(range);
    const byBucket = new Map<string, OrderProfit[]>();
    for (const p of profits) {
      const k = bucketKey(p.dateISO, g);
      (byBucket.get(k) || byBucket.set(k, []).get(k)!).push(p);
    }
    const timeseries = emptyBuckets(range, g).map((bucket) => {
      const s = aggregateFinance(byBucket.get(bucket) || []);
      return { bucket, revenue: s.revenue, grossProfit: s.grossProfit, contributionProfit: s.contributionProfit, contributionMargin: s.contributionMargin };
    });

    return NextResponse.json({
      range, granularity: g,
      summary, previous, gateways, timeseries,
      dataQuality: {
        coverage: summary.coverage,
        // Cobertura de fees SEPARADA: exact vs configured vs missing (por monto).
        feeCoverage: feeCoverageBreakdown(feeRows),
        feeExactOrders: profits.filter((p) => p.fee.source === 'exact').length,
        catalogProductsWithoutCost: costMap.productsWithoutCost,
        truncated: cur.truncated,
        configSource: 'wp-option-or-default',
      },
    });
  } catch (e: any) {
    console.error('[finance/summary]', e?.message || e);
    return NextResponse.json({ error: 'No se pudo calcular Finanzas' }, { status: 502 });
  }
}
