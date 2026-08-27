'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtRelative, fmtARS } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { Sparkline } from '@/components/admin/Sparkline';
import { METRICS, DEFAULT_KPIS, fmtMetric, type MetricFormat } from '@/lib/performance/registry';

// Serie → array por métrica (para sparklines y chart). Sólo donde hay dato real.
const SERIES_KEY: Record<string, (s: any) => number | null> = {
  revenue: (s) => s.revenue, orders: (s) => s.orders, aov: (s) => s.aov,
  contributionProfit: (s) => s.contribution, cam: (s) => s.cam,
  adSpend: (s) => s.adSpend, metaRoas: (s) => s.metaRoas, mer: (s) => s.mer,
};
const CHART_METRICS = ['revenue', 'contributionProfit', 'cam', 'adSpend', 'metaRoas', 'mer', 'orders', 'aov'];

function delta(v: number | null, p: number | null): { absolute: number; pct: number | null } | undefined {
  if (v == null || p == null || p === 0) return undefined;
  return { absolute: v - p, pct: (v - p) / p };
}

export default function PerformancePage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', true));
  const [d, setD] = useState<any | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [chartMetric, setChartMetric] = useState('revenue');
  const [chartMetric2, setChartMetric2] = useState<string>('');

  const load = useCallback(async (r: RangeState) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC });
      const res = await fetch(`/api/admin/performance/summary?${qs}`, { headers: headers() });
      if (!res.ok) throw new Error();
      setD(await res.json());
      setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

  const sparkOf = useCallback((id: string): number[] | undefined => {
    if (!d?.series || !SERIES_KEY[id]) return undefined;
    const arr = d.series.map(SERIES_KEY[id]).filter((n: any) => Number.isFinite(n));
    return arr.length >= 2 ? arr : undefined;
  }, [d]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin"
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }

  const K = d?.kpis || {};
  const val = (id: string) => (K[id]?.value ?? null);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Performance</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Cómo evolucionan las métricas del negocio — Woo, Finanzas, Meta y costos operativos, cruzados.</p>
        </div>
        <div className="flex items-center gap-2">
          {d?.freshness?.at && <span className="text-[11px] text-muted-foreground">Actualizado {fmtRelative(d.freshness.at)}</span>}
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
            <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('costos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Tu perfil no tiene acceso a Finanzas.</div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudo calcular Performance. Reintentá.</div>
      ) : !d ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[92px] bg-muted/40 rounded-lg animate-pulse" />)}</div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {DEFAULT_KPIS.map((id) => {
              const def = METRICS[id]; if (!def) return null;
              const v = val(id); const p = K[id]?.prev ?? null;
              const dl = def.comparison !== 'neutral' ? delta(v, p) : undefined;
              const partial = (def.source === 'meta' && (id === 'cam' || id === 'operatingProfit' || id === 'effectiveAdCost' || id === 'mer')) && d.freshness?.adCostPartial;
              return (
                <KpiCard key={id} label={def.label} value={fmtMetric(v, def.format, def.format === 'ars')}
                  delta={dl} positiveIsGood={def.comparison === 'up-good'} estimated={!!partial}
                  spark={sparkOf(id)} sparkTone={def.comparison === 'down-good' ? 'negative' : 'default'}
                  info={def.description + (def.format === 'ars' && v != null ? ` · ${fmtARS(v)}` : '')} />
              );
            })}
          </div>

          {/* Chart principal (multi-serie: normalización independiente = vista indexada) */}
          <SectionTitle>Evolución</SectionTitle>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select value={chartMetric} onChange={(e) => setChartMetric(e.target.value)} className="border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium focus:outline-none focus:border-border-mid">
                {CHART_METRICS.map((m) => <option key={m} value={m}>{METRICS[m]?.label}</option>)}
              </select>
              <span className="text-[12px] text-muted-foreground">vs</span>
              <select value={chartMetric2} onChange={(e) => setChartMetric2(e.target.value)} className="border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-border-mid">
                <option value="">—</option>
                {CHART_METRICS.filter((m) => m !== chartMetric).map((m) => <option key={m} value={m}>{METRICS[m]?.label}</option>)}
              </select>
              {chartMetric2 && <span className="text-[11px] text-muted-foreground/60">vista indexada (cada serie a su propia escala)</span>}
            </div>
            <PerfChart series={d.series} m1={chartMetric} m2={chartMetric2} />
          </div>

          {/* Profitability */}
          <SectionTitle>Profitability</SectionTitle>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                {profitRows(d.profitStack).map((r, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${r.total ? 'bg-muted/30' : ''}`}>
                    <td className={`px-4 py-2.5 ${r.total ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{r.label}{r.partial && <span className="text-warning text-[11px]"> · partial</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground w-28 hidden sm:table-cell">{r.margin != null ? `${(r.margin * 100).toFixed(1).replace('.', ',')}%` : ''}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums w-40 ${r.total ? 'font-bold text-foreground' : 'text-foreground'}`}>{r.amount == null ? <span className="text-warning font-normal">Pendiente</span> : fmtARS(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 mt-8">
            {/* Marketing Efficiency */}
            <div>
              <SectionTitle right={<Link href="/admin/ads" className="text-[11px] text-muted-foreground hover:text-foreground">Ver Ads →</Link>}>Marketing efficiency</SectionTitle>
              {d.metaConnected ? (
                <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
                  <EffRow label="Meta Spend" value={fmtARS(val('adSpend') || 0)} />
                  <EffRow label="Effective Ad Cost" value={fmtARS(val('effectiveAdCost') || 0)} tag={d.freshness?.adCostPartial ? 'partial' : undefined} />
                  <EffRow label="Meta ROAS" value={fmtMetric(val('metaRoas'), 'x')} hint="Meta atribuido" />
                  <EffRow label="Breakeven ROAS" value={fmtMetric(val('breakevenRoas'), 'x')} hint="margen de contribución" />
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[12.5px] font-medium text-foreground">Señal</span>
                    {(() => { const roas = val('metaRoas'), be = val('breakevenRoas'); const sig = roas == null || be == null ? 'unknown' : roas >= be * 1.1 ? 'above' : roas >= be * 0.9 ? 'near' : 'below';
                      const cls = sig === 'above' ? 'bg-success-soft text-success' : sig === 'below' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground';
                      const lbl = sig === 'above' ? 'Sobre breakeven' : sig === 'below' ? 'Bajo breakeven' : sig === 'near' ? 'En breakeven' : '—';
                      return <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${cls}`}>{lbl}</span>; })()}
                  </div>
                  <EffRow label="MER" value={fmtMetric(val('mer'), 'x')} hint="Woo / Effective Ad Cost" />
                  <EffRow label="Meta CPA" value={fmtARS(val('metaCpa') || 0)} />
                  <EffRow label="Blended CAC" value={val('blendedCac') == null ? '—' : fmtARS(val('blendedCac')!)} />
                  <EffRow label="Ad Spend % Revenue" value={fmtMetric(val('adSpendPct'), 'pct')} />
                </div>
              ) : <div className="bg-card border border-border rounded-lg p-6 text-center text-[12.5px] text-muted-foreground">Meta no conectado. <Link href="/admin/integraciones" className="text-foreground hover:underline">Conectar</Link></div>}
            </div>

            {/* Cost Structure */}
            <div>
              <SectionTitle>Cost structure</SectionTitle>
              <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
                {[['cogs', val('cogs')], ['paymentFees', val('paymentFees')], ['shipping', val('shipping')], ['effectiveAdCost', val('effectiveAdCost')], ['operatingExpenses', val('operatingExpenses')], ['variableCosts', val('variableCosts')]].map(([id, v]: any) => {
                  const rev = val('revenue') || 0; const pctRev = rev > 0 && v != null ? (v as number) / rev : null;
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-[12.5px] text-foreground w-40 shrink-0">{METRICS[id].label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/60" style={{ width: `${Math.min(100, (pctRev || 0) * 100)}%` }} /></div>
                      <span className="text-[12px] text-muted-foreground tabular-nums w-12 text-right">{pctRev != null ? `${(pctRev * 100).toFixed(1)}%` : '—'}</span>
                      <span className="text-[12.5px] text-foreground tabular-nums w-28 text-right">{v == null ? '—' : fmtARS(v)}</span>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground/60 pt-1">% sobre Revenue. Effective Ad Cost {d.freshness?.adCostPartial && '· partial (impuestos pendientes)'}. Shipping con su calidad real.</p>
              </div>
            </div>
          </div>

          {/* Customers + Data Quality */}
          <div className="grid gap-3 lg:grid-cols-2 mt-8">
            <div>
              <SectionTitle>Customers</SectionTitle>
              <div className="bg-card border border-border rounded-lg p-4">
                {d.customers ? (
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Nuevos" value={String(d.customers.newCount ?? '—')} sub={fmtARS(d.customers.revenueNew || 0)} />
                    <Stat label="Recurrentes" value={String(d.customers.recurringCount ?? '—')} sub={`${Math.round((d.customers.recurringPct || 0) * 100)}%`} />
                    <Stat label="Blended CAC" value={val('blendedCac') == null ? '—' : fmtARS(val('blendedCac')!)} sub="por cliente nuevo" />
                    <Stat label="AOV" value={fmtARS(val('aov') || 0)} sub="ticket promedio" />
                    <Stat label="Rev. nuevos" value={fmtARS(d.customers.revenueNew || 0)} />
                    <Stat label="LTV" value="—" sub="próximamente" muted />
                  </div>
                ) : <p className="text-[12.5px] text-muted-foreground">Sin datos de clientes.</p>}
              </div>
            </div>
            <div>
              <SectionTitle>Data quality</SectionTitle>
              <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
                <DQRow label="COGS coverage" value={d.dataQuality.cogs} kind="pct" />
                <DQRow label="Payment fees" value={d.dataQuality.feeExact} extra={`exacto · ${((d.dataQuality.feeConfigured || 0) * 100).toFixed(0)}% config`} kind="pct" />
                <DQRow label="Shipping" value={d.dataQuality.shipping} kind="pct" tone={(d.dataQuality.shipping || 0) < 1 ? 'estimated' : 'exact'} />
                <DQRow label="Effective Ad Cost" value={d.dataQuality.adCostPartial === false ? 1 : 0} kind="badge" tone={d.dataQuality.adCostPartial ? 'missing' : 'exact'} extra={d.dataQuality.adCostPartial ? 'impuestos pendientes' : 'ok'} />
                {d.dataQuality.opInventory && <DQRow label="Operating Costs" value={null} kind="text" extra={`${d.dataQuality.opInventory.known}/${d.dataQuality.opInventory.total} con monto`} />}
                <p className="text-[11px] text-muted-foreground/60 pt-1">Calidad real por fuente — sin score global inventado. exact / configured / estimated / missing.</p>
              </div>
            </div>
          </div>

          {/* Product performance */}
          <SectionTitle right={<Link href="/admin/finance/rentabilidad" className="text-[11px] text-muted-foreground hover:text-foreground">Ver rentabilidad →</Link>}>Product performance</SectionTitle>
          <ProductTable rows={d.topProducts || []} />
        </>
      )}
    </div>
  );
}

function profitRows(ps: any) {
  const nr = ps.netRevenue || 0;
  const m = (a: number | null) => (a != null && nr > 0 ? a / nr : null);
  return [
    { label: 'Revenue', amount: ps.revenue },
    { label: 'Net Revenue', amount: ps.netRevenue, total: true },
    { label: 'Gross Profit', amount: ps.grossProfit, margin: m(ps.grossProfit), total: true },
    { label: 'Contribution Profit', amount: ps.contributionProfit, margin: m(ps.contributionProfit), total: true },
    { label: 'Contribution After Marketing', amount: ps.cam, margin: m(ps.cam), total: true },
    { label: 'Operating Profit Estimated', amount: ps.operatingProfit, margin: m(ps.operatingProfit), total: true, partial: ps.operatingProfitPartial },
  ];
}

function EffRow({ label, value, hint, tag }: { label: string; value: string; hint?: string; tag?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-muted-foreground">{label}{hint && <span className="text-muted-foreground/50 text-[11px]"> · {hint}</span>}</span>
      <span className="text-[13px] font-medium text-foreground tabular-nums flex items-center gap-1.5">{value}{tag && <span className="text-[9.5px] uppercase text-warning bg-warning-soft rounded-full px-1.5 py-0.5">{tag}</span>}</span>
    </div>
  );
}
function Stat({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className={`text-[16px] font-bold tabular-nums mt-0.5 ${muted ? 'text-muted-foreground/50' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 tabular-nums">{sub}</p>}
    </div>
  );
}
const DQ_TONE: Record<string, string> = {
  exact: 'bg-success-soft text-success', configured: 'bg-secondary text-secondary-foreground',
  estimated: 'bg-warning-soft text-warning', missing: 'bg-warning-soft text-warning',
};
const DQ_LABEL: Record<string, string> = { exact: 'Exacto', configured: 'Configurado', estimated: 'Estimado', missing: 'Faltante' };
function DQRow({ label, value, kind, extra, tone }: { label: string; value: number | null; kind: string; extra?: string; tone?: 'exact' | 'configured' | 'estimated' | 'missing' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12.5px] text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {extra && <span className="text-[11px] text-muted-foreground tabular-nums">{extra}</span>}
        {kind === 'pct' && value != null ? <span className="text-[12.5px] tabular-nums text-foreground">{(value * 100).toFixed(0)}%</span> : null}
        {tone && <span className={`text-[9.5px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${DQ_TONE[tone]}`}>{DQ_LABEL[tone]}</span>}
      </div>
    </div>
  );
}

function ProductTable({ rows }: { rows: any[] }) {
  const cols: Column<any>[] = [
    { key: 'name', header: 'Producto', render: (p) => <span className="truncate">{p.name}</span> },
    { key: 'units', header: 'Unid.', align: 'right', render: (p) => <span className="tabular-nums text-muted-foreground">{p.units}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (p) => <span className="tabular-nums">{fmtARS(p.revenue)}</span> },
    { key: 'cogs', header: 'COGS', align: 'right', hideOnMobile: true, render: (p) => p.cogs == null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-muted-foreground">{fmtARS(p.cogs)}</span> },
    { key: 'contribution', header: 'Contribución', align: 'right', render: (p) => p.contribution == null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums">{fmtARS(p.contribution)}</span> },
  ];
  return <DataTable columns={cols} rows={rows} keyOf={(p) => p.productId} emptyTitle="Sin ventas en el período" />;
}

// Chart de líneas: 1–2 series, cada una normalizada a su propio min-max (indexado).
function PerfChart({ series, m1, m2 }: { series: any[]; m1: string; m2: string }) {
  const W = 900, H = 240, PAD = 6;
  const pick = (id: string) => (series || []).map((s) => SERIES_KEY[id]?.(s) ?? null);
  const norm = (arr: (number | null)[]) => {
    const vals = arr.filter((n): n is number => Number.isFinite(n as number));
    if (vals.length < 2) return null;
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
    const step = W / (arr.length - 1);
    return arr.map((v, i) => v == null ? null : [i * step, H - PAD - ((v - min) / span) * (H - 2 * PAD)] as const);
  };
  const path = (pts: any) => pts ? pts.filter(Boolean).map((p: any, i: number) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') : '';
  const s1 = norm(pick(m1)); const s2 = m2 ? norm(pick(m2)) : null;
  if (!s1) return <div className="h-[240px] grid place-items-center text-[12px] text-muted-foreground/60">Sin serie para el período.</div>;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320, height: 240 }} preserveAspectRatio="none">
        <path d={path(s1)} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinejoin="round" />
        {s2 && <path d={path(s2)} fill="none" stroke="hsl(var(--warning))" strokeWidth="1.6" strokeDasharray="4 3" strokeLinejoin="round" opacity="0.85" />}
      </svg>
      <div className="flex gap-4 text-[11px] mt-1">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-3 bg-foreground rounded-sm" />{METRICS[m1]?.label}</span>
        {m2 && <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-3 bg-warning rounded-sm" />{METRICS[m2]?.label}</span>}
      </div>
    </div>
  );
}
