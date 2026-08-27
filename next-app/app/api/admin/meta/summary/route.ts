import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { getMetaData, metaConfigured, metaAccountId } from '@/lib/meta/client';
import { buildAdvertisingSummary, type BusinessInputs } from '@/lib/meta/summary';
import type { AdvertisingCostRule } from '@/lib/meta/metrics';

// Cruce server-side: Meta (cache 10min) + Finance + Operating + Customers, todo
// reusando los endpoints existentes (sin duplicar fórmulas). La cuenta es ARS/AR,
// así que las fechas del rango se pasan como YYYY-MM-DD AR-local.

export const dynamic = 'force-dynamic';
const AR_OFFSET_MS = 180 * 60_000;
const arDate = (iso: string) => new Date(Date.parse(iso) - AR_OFFSET_MS).toISOString().slice(0, 10);

async function internal<T>(origin: string, path: string, key: string): Promise<T | null> {
  try {
    const res = await fetch(`${origin}${path}`, { headers: { 'x-admin-key': key }, cache: 'no-store' });
    return res.ok ? (res.json() as Promise<T>) : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  if (!adminSecretMatches(key)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  if (!metaConfigured()) {
    return NextResponse.json({ connected: false, reason: 'not_configured', account: metaAccountId() });
  }

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start y end requeridos' }, { status: 400 });
  const since = arDate(start), until = arDate(end);
  const force = req.nextUrl.searchParams.get('refresh') === '1';
  const origin = req.nextUrl.origin;
  const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  try {
    const [meta, fin, op, cust, cfg] = await Promise.all([
      getMetaData(since, until, force),
      internal<any>(origin, `/api/admin/finance/summary?${qs}&compare=0`, key),
      internal<any>(origin, `/api/admin/finance/operating-costs/summary?${qs}`, key),
      internal<any>(origin, `/api/admin/dashboard/customers?${qs}`, key),
      internal<any>(origin, `/api/admin/finance/config`, key),
    ]);

    const fs = fin?.summary || {};
    const business: BusinessInputs = {
      wooRevenue: fs.revenue ?? 0,
      netRevenue: fs.netRevenue ?? fs.revenue ?? 0,
      contributionProfit: fs.contributionProfit ?? 0,
      newCustomers: cust?.newCount ?? null,
      operatingExpenses: op?.summary?.totalARS ?? 0,
      operatingExpensesPartial: (op?.summary?.missingCount ?? 0) > 0,
    };
    // Reglas de ad-cost desde finance-config (option existente). v1: normalmente vacío.
    const rules: AdvertisingCostRule[] = Array.isArray(cfg?.config?.advertising) ? cfg.config.advertising : [];

    const summary = buildAdvertisingSummary(
      meta.account ? { name: meta.account.name, currency: meta.account.currency, timezone: meta.account.timezone } : null,
      meta.accountRow, meta.campaigns, meta.statuses, business, rules, until,
    );

    return NextResponse.json({ connected: true, summary, lastUpdated: new Date(meta.at).toISOString(), stale: meta.stale });
  } catch (e: any) {
    return NextResponse.json({ connected: true, error: 'No pudimos consultar Meta', detail: String(e?.message || e) }, { status: 502 });
  }
}
