import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getCostMap } from '@/lib/dashboard/cost-map';
import { fetchOrdersInRange, type DashOrder } from '@/lib/dashboard/wc-orders';
import { computeSummary, compareSummaries, computeTopProducts } from '@/lib/dashboard/finance';
import { previousRange, granularityFor, bucketKey, emptyBuckets, type Range } from '@/lib/dashboard/periods';

export const dynamic = 'force-dynamic';

function parseRange(sp: URLSearchParams): Range | null {
  const start = sp.get('start');
  const end = sp.get('end');
  if (!start || !end) return null;
  const s = Date.parse(start), e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  // Tope de seguridad: máximo ~400 días por request.
  if (e - s > 400 * 24 * 3600_000) return null;
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
    const costMap = await getCostMap();
    const costOf = costMap.costOf;

    const [cur, prev] = await Promise.all([
      fetchOrdersInRange(range.startUTC, range.endUTC, { onlyPaid: true }),
      wantCompare
        ? fetchOrdersInRange(previousRange(range).startUTC, previousRange(range).endUTC, { onlyPaid: true })
        : Promise.resolve(null),
    ]);

    const current = computeSummary(cur.orders, costOf);
    const previous = prev ? computeSummary(prev.orders, costOf) : null;
    const comparison = previous ? compareSummaries(current, previous) : null;

    // Timeseries: mismos KPIs por bucket, con las mismas fórmulas.
    const g = granularityFor(range);
    const byBucket = new Map<string, DashOrder[]>();
    for (const o of cur.orders) {
      const k = bucketKey(o.dateGmt, g);
      (byBucket.get(k) || byBucket.set(k, []).get(k)!).push(o);
    }
    const points = emptyBuckets(range, g).map((bucket) => {
      const s = computeSummary(byBucket.get(bucket) || [], costOf);
      return { bucket, revenue: s.revenue, orders: s.orders, profit: s.contributionProfit, aov: s.aov };
    });

    const topProducts = computeTopProducts(cur.orders, costOf, 5);

    return NextResponse.json({
      range,
      granularity: g,
      current,
      previous,
      comparison,
      timeseries: points,
      topProducts,
      dataQuality: {
        productsWithoutCost: current.quality.productsWithoutCost,
        unitsMissing: current.quality.unitsMissing,
        costCoverage: current.quality.costCoverage,
        missingCostTypes: current.quality.missingCostTypes,
        contributionIsPartial: current.quality.contributionIsPartial,
        catalogProductsWithoutCost: costMap.productsWithoutCost,
        truncated: cur.truncated || (prev?.truncated ?? false),
      },
    });
  } catch (e: any) {
    console.error('[dashboard/summary]', e?.message || e);
    return NextResponse.json({ error: 'No se pudo calcular el resumen' }, { status: 502 });
  }
}
