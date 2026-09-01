import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchDailyInsights, fetchInsights, fetchAccount, metaConfigured } from '@/lib/meta/client';
import { buildAdvertisingSummary, type BusinessInputs } from '@/lib/meta/summary';
import type { AdvertisingCostRule } from '@/lib/meta/metrics';
import { previousRange } from '@/lib/dashboard/periods';

// Performance analytics — UN endpoint, agregación server-side, todo en paralelo
// (no N+1, no 16 fetches del browser). Reusa los endpoints existentes (no duplica
// fórmulas) y suma la serie diaria de Meta. Devuelve KPIs con valor + previo +
// sparkline, la serie para el chart, y los datos de cada sección.

export const dynamic = 'force-dynamic';
// Agrega varias paginas de pedidos de Woo: el default de la plataforma queda corto.
export const maxDuration = 60;
const AR_OFFSET_MS = 180 * 60_000;
const arDate = (iso: string) => new Date(Date.parse(iso) - AR_OFFSET_MS).toISOString().slice(0, 10);

async function internal<T>(origin: string, path: string, key: string): Promise<T | null> {
  try { const r = await fetch(`${origin}${path}`, { headers: { 'x-admin-key': key }, cache: 'no-store' }); return r.ok ? (r.json() as Promise<T>) : null; }
  catch { return null; }
}
const kpi = (value: number | null, prev: number | null = null) => ({ value, prev });

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!adminSecretMatches(key)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start y end requeridos' }, { status: 400 });

  const origin = req.nextUrl.origin;
  const prev = previousRange({ startUTC: start, endUTC: end });
  const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const qsPrev = `start=${encodeURIComponent(prev.startUTC)}&end=${encodeURIComponent(prev.endUTC)}`;
  const t0 = Date.now();

  // Meta directo (NO vía meta/summary, que re-fetchea finance): account insights
  // + buildAdvertisingSummary con la data financiera que ya traemos. Elimina la
  // duplicación anidada de fetches de órdenes.
  const metaOn = metaConfigured();
  const metaWork = metaOn ? (async () => {
    const [account, accCur, accPrev, daily] = await Promise.all([
      fetchAccount().catch(() => null),
      fetchInsights('account', arDate(start), arDate(end)).catch(() => []),
      fetchInsights('account', arDate(prev.startUTC), arDate(prev.endUTC)).catch(() => []),
      fetchDailyInsights(arDate(start), arDate(end)).catch(() => []),
    ]);
    return { account, accCur: accCur[0] || null, accPrev: accPrev[0] || null, daily };
  })() : Promise.resolve(null);

  const [dash, fin, op, cust, cfg, meta] = await Promise.all([
    internal<any>(origin, `/api/admin/dashboard/summary?${qs}&compare=1`, key),
    internal<any>(origin, `/api/admin/finance/summary?${qs}&compare=1`, key),
    internal<any>(origin, `/api/admin/finance/operating-costs/summary?${qs}`, key),
    internal<any>(origin, `/api/admin/dashboard/customers?${qs}`, key),
    internal<any>(origin, `/api/admin/finance/config`, key),
    metaWork,
  ]);

  const dc = dash?.current || {}, dp = dash?.previous || {};
  const fc = fin?.summary || {}, fp = fin?.previous || {};
  const opS = op?.summary; const opARS = opS?.totalARS ?? 0;
  const opPartial = (opS?.missingCount ?? 0) > 0;
  const nr = fc.netRevenue ?? dc.revenue ?? 0;
  const rules: AdvertisingCostRule[] = Array.isArray(cfg?.config?.advertising) ? cfg.config.advertising : [];

  // Blended Meta actual + previo con las definiciones centrales (sin re-fetch).
  let mc: any = null, mp: any = null, metaConnected = false;
  if (meta && meta.account) {
    metaConnected = true;
    const acct = { name: meta.account.name, currency: meta.account.currency, timezone: meta.account.timezone };
    const bizCur: BusinessInputs = { wooRevenue: dc.revenue ?? 0, netRevenue: nr, contributionProfit: fc.contributionProfit ?? dc.contributionProfit ?? 0, newCustomers: cust?.newCount ?? null, operatingExpenses: opARS, operatingExpensesPartial: opPartial };
    mc = buildAdvertisingSummary(acct, meta.accCur, [], new Map(), bizCur, rules, arDate(end));
    if (meta.accPrev) {
      const bizPrev: BusinessInputs = { wooRevenue: fp.revenue ?? dp.revenue ?? 0, netRevenue: fp.netRevenue ?? dp.revenue ?? 0, contributionProfit: fp.contributionProfit ?? dp.contributionProfit ?? 0, newCustomers: null, operatingExpenses: opARS, operatingExpensesPartial: opPartial };
      mp = buildAdvertisingSummary(acct, meta.accPrev, [], new Map(), bizPrev, rules, arDate(prev.endUTC));
    }
  }
  const metaDaily = meta?.daily || [];

  const kpis: Record<string, { value: number | null; prev: number | null }> = {
    revenue: kpi(dc.revenue ?? null, dp.revenue ?? null),
    netRevenue: kpi(fc.netRevenue ?? null, fp.netRevenue ?? null),
    orders: kpi(dc.orders ?? null, dp.orders ?? null),
    aov: kpi(dc.aov ?? null, dp.aov ?? null),
    newCustomers: kpi(cust?.newCount ?? null),
    returningPct: kpi(cust?.recurringPct ?? null),
    grossProfit: kpi(fc.grossProfit ?? null, fp.grossProfit ?? null),
    grossMargin: kpi(fc.grossMargin ?? null, fp.grossMargin ?? null),
    contributionProfit: kpi(fc.contributionProfit ?? dc.contributionProfit ?? null, fp.contributionProfit ?? dp.contributionProfit ?? null),
    contributionMargin: kpi(fc.contributionMargin ?? null, fp.contributionMargin ?? null),
    cam: kpi(mc?.business.contributionAfterMarketing ?? null, mp?.business.contributionAfterMarketing ?? null),
    camMargin: kpi(mc?.business.camMargin ?? null, mp?.business.camMargin ?? null),
    operatingProfit: kpi(mc?.business.operatingProfitEstimated ?? null, mp?.business.operatingProfitEstimated ?? null),
    operatingMargin: kpi(mc && nr > 0 ? mc.business.operatingProfitEstimated / nr : null),
    adSpend: kpi(mc?.platform.spend ?? null, mp?.platform.spend ?? null),
    effectiveAdCost: kpi(mc?.ad.effective ?? null, mp?.ad.effective ?? null),
    metaRoas: kpi(mc?.platform.roas ?? null, mp?.platform.roas ?? null),
    metaCpa: kpi(mc?.platform.cpa ?? null, mp?.platform.cpa ?? null),
    mer: kpi(mc?.business.mer ?? null, mp?.business.mer ?? null),
    breakevenRoas: kpi(mc?.business.breakevenRoas ?? null, mp?.business.breakevenRoas ?? null),
    blendedCac: kpi(mc?.business.blendedCac ?? null, mp?.business.blendedCac ?? null),
    adSpendPct: kpi(mc?.business.adSpendPctRevenue ?? null, mp?.business.adSpendPctRevenue ?? null),
    cogs: kpi(dc.cogs ?? fc.cogs ?? null, dp.cogs ?? null),
    paymentFees: kpi(fc.paymentFees ?? null, fp.paymentFees ?? null),
    shipping: kpi(fc.shippingAbsorbed ?? null, fp.shippingAbsorbed ?? null),
    operatingExpenses: kpi(opARS, null),
    variableCosts: kpi(fc.variableCosts ?? null, fp.variableCosts ?? null),
  };

  // ── Serie diaria (Woo desde dashboard.timeseries + Meta daily) ──
  const woo = (dash?.timeseries || []) as { bucket: string; revenue: number; orders: number; profit: number; aov: number }[];
  const metaByDay = new Map<string, { spend: number; roas: number | null; pv: number }>();
  for (const d of (metaDaily as any[])) metaByDay.set(d.date, { spend: d.spend, roas: d.roas, pv: d.purchaseValue });
  const series = woo.map((w) => {
    const day = w.bucket.slice(0, 10);
    const m = metaByDay.get(day);
    const spend = m?.spend ?? 0;
    return {
      date: day, revenue: w.revenue, orders: w.orders, aov: w.aov, contribution: w.profit,
      adSpend: spend, metaRoas: m?.roas ?? null,
      mer: spend > 0 ? w.revenue / spend : null,
      cam: w.profit - spend,
    };
  });

  // ── Data quality (real, sin score inventado) ──
  const fdq = fin?.dataQuality || {};
  const dataQuality = {
    cogs: fdq.coverage?.cogs ?? dc.costCoverage ?? null,
    feeExact: fdq.feeCoverage?.exact ?? null, feeConfigured: fdq.feeCoverage?.configured ?? null, feeMissing: fdq.feeCoverage?.missing ?? null,
    shipping: fdq.coverage?.shipping ?? null,
    adCostPartial: mc ? mc.ad.upliftQuality !== 'exact' : null,
    opInventory: opS ? { known: opS.inventory?.known, total: opS.inventory?.total, missing: opS.inventory?.missing } : null,
  };

  return NextResponse.json({
    kpis, series, metaConnected,
    profitStack: { revenue: dc.revenue ?? 0, netRevenue: nr, grossProfit: fc.grossProfit ?? 0, contributionProfit: fc.contributionProfit ?? dc.contributionProfit ?? 0, cam: mc?.business.contributionAfterMarketing ?? null, operatingProfit: mc?.business.operatingProfitEstimated ?? null, operatingProfitPartial: mc?.business.operatingProfitPartial ?? null },
    gateways: fin?.gateways || [],
    topProducts: dash?.topProducts || [],
    customers: cust || null,
    dataQuality,
    freshness: { at: new Date().toISOString(), meta: metaConnected ? new Date().toISOString() : null, adCostPartial: dataQuality.adCostPartial },
    perf: { ms: Date.now() - t0, calls: 5 + (metaOn ? 4 : 0) },
  });
}
