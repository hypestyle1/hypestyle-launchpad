'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS, fmtDateTime } from '@/lib/admin-format';
import { OrderStatusBadge } from '@/components/admin/ui';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { MetricChart, type MetricKey } from '@/components/admin/MetricChart';
import {
  KpiCard, SectionTitle, AdsStrip, AttentionRow, TopProducts, CustomerSplit,
  type AttentionItem, type ProductRank, type CustomerSplitData,
} from '@/components/admin/dashboard/blocks';
import type { FinanceSummary, SummaryComparison } from '@/lib/dashboard/finance';
import type { Granularity } from '@/lib/dashboard/periods';

interface SummaryResponse {
  current: FinanceSummary;
  previous: FinanceSummary | null;
  comparison: SummaryComparison | null;
  granularity: Granularity;
  timeseries: { bucket: string; revenue: number; orders: number; profit: number; aov: number }[];
  topProducts: ProductRank[];
  dataQuality: { productsWithoutCost: number; catalogProductsWithoutCost: number; costCoverage: number; missingCostTypes: string[]; contributionIsPartial: boolean; truncated: boolean };
}
interface RecentOrder {
  id: number; number: string; date: string | null; customerName: string;
  status: string; total: number; net: number; profit: number | null;
}

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'profit', label: 'Profit' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'aov', label: 'AOV' },
];

export default function AdminInicio() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');

  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', true));
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryState, setSummaryState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attention, setAttention] = useState<{ attention: AttentionItem[]; opportunities: AttentionItem[] } | null>(null);
  const [recent, setRecent] = useState<RecentOrder[] | null>(null);
  const [customers, setCustomers] = useState<CustomerSplitData | null>(null);
  const [botItem, setBotItem] = useState<AttentionItem | null>(null);
  const [metric, setMetric] = useState<MetricKey>('profit');
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const loadSummary = useCallback(async (r: RangeState) => {
    if (!puede('pedidos')) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setSummaryState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC, compare: r.compare ? '1' : '0' });
      const res = await fetch(`/api/admin/dashboard/summary?${qs}`, { headers: headers(), signal: ac.signal });
      if (!res.ok) throw new Error(String(res.status));
      setSummary(await res.json());
      setSummaryState('ok');
    } catch (e: any) {
      if (e?.name !== 'AbortError') setSummaryState('error');
    }
    // Clientes nuevos vs recurrentes: depende del período, carga aparte.
    setCustomers(null);
    fetch(`/api/admin/dashboard/customers?start=${encodeURIComponent(r.range.startUTC)}&end=${encodeURIComponent(r.range.endUTC)}`, { headers: headers() })
      .then((res2) => (res2.ok ? res2.json() : null)).then((d) => d && !d.error && setCustomers(d)).catch(() => {});
  }, [headers, puede]);

  const loadOps = useCallback(async () => {
    if (puede('pedidos')) {
      fetch('/api/admin/dashboard/attention', { headers: headers() })
        .then((r) => (r.ok ? r.json() : null)).then((d) => d && setAttention({ attention: d.attention || [], opportunities: d.opportunities || [] })).catch(() => {});
      fetch('/api/admin/dashboard/recent-orders?limit=8', { headers: headers() })
        .then((r) => (r.ok ? r.json() : null)).then((d) => d && setRecent(d.orders)).catch(() => {});
    }
    // Capacidad n8n: sólo aparece en "Requiere atención" si hay riesgo proyectado.
    if (puede('conversaciones')) {
      fetch('/api/admin/bot/capacity', { headers: headers() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d || !d.status || d.status === 'healthy') { setBotItem(null); return; }
          const projPct = Math.round((d.projectedPct || 0) * 100);
          const msg = d.status === 'critical' && d.exhaustionDate
            ? `n8n podría agotar el cupo (${projPct}% proyectado)`
            : `n8n proyecta ${d.projectedMonthEnd?.toLocaleString('es-AR')} / ${d.limit?.toLocaleString('es-AR')} ejecuciones`;
          setBotItem({ key: 'bot-capacity', label: msg, sub: `${projPct}% del cupo este mes`, value: projPct, href: '/admin/bot', tone: d.status === 'critical' ? 'critical' : 'warning' });
        }).catch(() => setBotItem(null));
    }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) loadSummary(range); }, [autorizado, range, loadSummary]);
  useEffect(() => { if (autorizado) loadOps(); }, [autorizado, loadOps]);

  const refresh = () => { setRange((r) => makeRangeState(r.presetId, r.compare, r.custom)); loadOps(); };

  // ── Login por clave compartida ──
  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <p className="text-[13px] text-muted-foreground mb-4">Clave de administrador</p>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90">Entrar</button>
          <Link href="/admin/login" className="block text-[12px] text-muted-foreground/70 hover:text-foreground mt-4 underline">O entrá con tu perfil</Link>
        </div>
      </div>
    );
  }

  const cur = summary?.current;
  const cmp = summary?.comparison;
  const dq = summary?.dataQuality;
  const coveragePct = dq ? Math.round(dq.costCoverage * 100) : null;
  const partialInfo = dq ? (
    <>
      <strong className="text-foreground">Net Revenue − COGS.</strong> Todavía no se descuentan: {dq.missingCostTypes.join(', ')} (no se asumen en cero).
      {coveragePct !== null && <> Cobertura de costos: {coveragePct}% del revenue.</>}
      {' '}Fuente: WooCommerce + costos Hype.
    </>
  ) : null;
  const coverageInfo = dq ? (
    <>
      <strong className="text-foreground">Revenue con costo conocido / Revenue total.</strong> Cuánto del profit es confiable.
      {dq.catalogProductsWithoutCost > 0 && <> {dq.catalogProductsWithoutCost} productos del catálogo sin costo configurado.</>}
    </>
  ) : null;

  const quick = [
    { seccion: 'pedidos', label: 'Pedidos', href: '/admin/pedidos' },
    { seccion: 'creadores', label: 'Creadores', href: '/admin/creadores' },
    { seccion: 'mayoristas', label: 'Locales', href: '/admin/mayoristas' },
    { seccion: 'reviews', label: 'Reseñas', href: '/admin/reviews' },
    { seccion: 'costos', label: 'Costos y márgenes', href: '/admin/costos' },
    { seccion: 'newsletter', label: 'Newsletter', href: '/admin/newsletter' },
    { seccion: 'conversaciones', label: 'Conversaciones', href: '/admin/conversaciones' },
    { seccion: 'perfiles', label: 'Perfiles', href: '/admin/perfiles' },
  ].filter((t) => puede(t.seccion));

  const orderCols: Column<RecentOrder>[] = [
    { key: 'number', header: 'Pedido', render: (o) => <span className="font-medium tabular-nums">#{o.number}</span> },
    { key: 'date', header: 'Fecha', hideOnMobile: true, render: (o) => <span className="text-muted-foreground whitespace-nowrap">{o.date ? fmtDateTime(o.date) : '—'}</span> },
    { key: 'customer', header: 'Cliente', render: (o) => <span className="truncate">{o.customerName || '—'}</span> },
    { key: 'status', header: 'Estado', render: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="tabular-nums">{fmtARS(o.total)}</span> },
    { key: 'net', header: 'Neto', align: 'right', hideOnMobile: true, render: (o) => <span className="tabular-nums text-muted-foreground">{fmtARS(o.net)}</span> },
    { key: 'profit', header: 'Profit', align: 'right', hideOnMobile: true, render: (o) => <span className="tabular-nums">{o.profit === null ? <span className="text-muted-foreground/50">—</span> : fmtARS(o.profit)}</span> },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Panel</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Cómo viene Hype y qué necesita una decisión.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={refresh} title="Actualizar"
            className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
            <RefreshCw size={14} className={summaryState === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('pedidos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">
          Tu perfil no tiene acceso a ventas. Usá los accesos de abajo.
        </div>
      ) : (
        <>
          {/* Bloque Tienda + Chart */}
          <SectionTitle>Tienda</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 auto-rows-min">
              <KpiCard label="Revenue" value={cur ? fmtARS(cur.revenue) : '—'} delta={cmp?.revenue}
                info="Facturación de pedidos pagados (procesando, completado, enviado) en el período. Fuente: WooCommerce." />
              <KpiCard label="Pedidos" value={cur ? cur.orders : '—'} delta={cmp?.orders}
                info="Cantidad de pedidos pagados incluidos en Revenue." />
              <KpiCard label="AOV" value={cur ? fmtARS(cur.aov) : '—'} delta={cmp?.aov}
                info="Ticket promedio: Revenue / Pedidos." />
              <KpiCard label="COGS" value={cur ? fmtARS(cur.cogs) : '—'} delta={cmp?.cogs} positiveIsGood={false}
                estimated={coveragePct !== null && coveragePct < 100}
                info="Costo de los productos vendidos, según los costos configurados en Hype. Sólo cubre los productos con costo cargado." />
              <KpiCard label="Contribution Profit" value={cur ? fmtARS(cur.contributionProfit) : '—'} delta={cmp?.contributionProfit} emphasis
                sub={cur ? `${(cur.profitMargin * 100).toFixed(1).replace('.', ',')}% margen` : undefined}
                estimated={dq?.contributionIsPartial} info={partialInfo} />
              <KpiCard label="Cost Coverage" value={coveragePct !== null ? `${coveragePct}%` : '—'}
                sub={dq && dq.catalogProductsWithoutCost > 0 ? `${dq.catalogProductsWithoutCost} sin costo` : undefined}
                info={coverageInfo} />
            </div>

            <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4 flex flex-col min-h-[320px]">
              <div className="flex items-center gap-1 mb-3">
                {METRICS.map((m) => (
                  <button key={m.key} onClick={() => setMetric(m.key)}
                    className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${metric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-[240px]">
                <MetricChart
                  data={summary?.timeseries || []}
                  previous={null}
                  metric={metric}
                  granularity={summary?.granularity || 'day'}
                  loading={summaryState === 'loading' && !summary}
                  error={summaryState === 'error'}
                />
              </div>
            </div>
          </div>

          {/* Anuncios — franja compacta mientras Meta no esté conectado */}
          <SectionTitle>Anuncios</SectionTitle>
          <AdsStrip />

          {/* Top products + Clientes */}
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] mt-8">
            <div>
              <SectionTitle>Top productos</SectionTitle>
              {summaryState === 'loading' && !summary
                ? <div className="h-[180px] bg-muted/40 rounded-lg animate-pulse" />
                : <TopProducts rows={summary?.topProducts || []} fmt={fmtARS} />}
            </div>
            <div>
              <SectionTitle>Nuevos vs recurrentes</SectionTitle>
              {customers === null
                ? <div className="h-[140px] bg-muted/40 rounded-lg animate-pulse" />
                : <CustomerSplit data={customers} fmt={fmtARS} />}
            </div>
          </div>

          {/* Requiere atención */}
          <SectionTitle>Requiere atención</SectionTitle>
          {attention === null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[56px] bg-muted/40 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {botItem && <AttentionRow key={botItem.key} item={botItem} />}
              {attention.attention.map((it) => <AttentionRow key={it.key} item={it} />)}
            </div>
          )}

          {/* Recuperación / oportunidades */}
          {attention && attention.opportunities.length > 0 && (
            <>
              <SectionTitle>Recuperación</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                {attention.opportunities.map((it) => <AttentionRow key={it.key} item={it} />)}
              </div>
            </>
          )}

          {/* Últimos pedidos */}
          <SectionTitle right={<Link href="/admin/pedidos" className="text-[12px] text-muted-foreground hover:text-foreground">Ver todos →</Link>}>
            Últimos pedidos
          </SectionTitle>
          <DataTable
            columns={orderCols}
            rows={recent || []}
            keyOf={(o) => o.id}
            loading={recent === null}
            onRowClick={(o) => router.push(`/admin/pedidos/${o.id}`)}
            emptyTitle="Sin pedidos todavía"
          />
        </>
      )}

      {/* Accesos rápidos */}
      <SectionTitle>Accesos rápidos</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {quick.map((t) => (
          <Link key={t.href} href={t.href}
            className="bg-card border border-border rounded-lg px-4 py-3 text-[13px] font-medium text-foreground hover:border-border-mid transition-colors">
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
