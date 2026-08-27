'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { Waterfall, GatewayTable, DataToComplete, DataQualityCard, FinanceSectionTitle, pct, type WaterfallRow, type GatewayRow, type QualityRow } from '@/components/admin/finance/blocks';
import type { FinanceSummary } from '@/lib/finance/calculations';

interface SummaryResp {
  summary: FinanceSummary;
  previous: FinanceSummary | null;
  gateways: GatewayRow[];
  dataQuality: { coverage: { cogs: number; fees: number; shipping: number; variable: number }; feeCoverage: { exact: number; configured: number; missing: number }; feeExactOrders: number; catalogProductsWithoutCost: number };
}

export default function FinanceResumen() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', true));
  const [data, setData] = useState<SummaryResp | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = useCallback(async (r: RangeState) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC, compare: r.compare ? '1' : '0' });
      const res = await fetch(`/api/admin/finance/summary?${qs}`, { headers: headers() });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <p className="text-[13px] text-muted-foreground mb-4">Clave de administrador</p>
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90">Entrar</button>
        </div>
      </div>
    );
  }

  const s = data?.summary;
  const cmp = data?.previous;
  const dq = data?.dataQuality;
  const delta = (cur?: number, prev?: number) => (cur !== undefined && prev !== undefined ? { absolute: cur - prev, pct: prev !== 0 ? (cur - prev) / prev : null } : undefined);

  const waterfall: WaterfallRow[] = s ? [
    { label: 'Revenue', amount: s.revenue, kind: 'add' },
    { label: 'Refunds', amount: s.refunds || 0, kind: 'subtract', source: 'exact' },
    { label: 'Net Revenue', amount: s.netRevenue, kind: 'subtotal' },
    { label: 'COGS', amount: s.cogs, kind: 'subtract', source: dq && dq.coverage.cogs >= 1 ? 'configured' : 'configured', hint: dq ? `cobertura ${pct(dq.coverage.cogs)}` : undefined },
    { label: 'Gross Profit', amount: s.grossProfit, kind: 'subtotal', hint: `margen bruto ${pct(s.grossMargin)}` },
    { label: 'Payment Fees', amount: s.paymentFees, kind: 'subtract', source: (dq && dq.feeCoverage.exact > 0) ? 'exact' : 'configured', hint: dq ? `exacto ${pct(dq.feeCoverage.exact)} · configurado ${pct(dq.feeCoverage.configured)} · fee ef. ${pct(s.effectiveFeeRate)}` : undefined },
    { label: 'Shipping Absorbed', amount: dq && dq.coverage.shipping > 0 ? s.shippingAbsorbed : null, kind: 'subtract', source: dq && dq.coverage.shipping > 0 ? 'configured' : 'missing' },
    { label: 'Variable Costs', amount: dq && dq.coverage.variable > 0 ? s.variableCosts : null, kind: 'subtract', source: dq && dq.coverage.variable > 0 ? 'configured' : 'missing' },
    { label: 'Contribution Profit', amount: s.contributionProfit, kind: 'result', hint: `margen de contribución ${pct(s.contributionMargin)} · estimado` },
  ] : [];

  const qualityRows: QualityRow[] = dq ? [
    { label: 'COGS', segments: [{ kind: 'configured', value: dq.coverage.cogs }, { kind: 'missing', value: Math.max(0, 1 - dq.coverage.cogs) }] },
    { label: 'Payment fees', segments: [{ kind: 'exact', value: dq.feeCoverage.exact }, { kind: 'configured', value: dq.feeCoverage.configured }, { kind: 'missing', value: dq.feeCoverage.missing }] },
    { label: 'Shipping', segments: [{ kind: 'estimated', value: dq.coverage.shipping }, { kind: 'missing', value: Math.max(0, 1 - dq.coverage.shipping) }] },
  ] : [];

  const toComplete = dq ? [
    dq.catalogProductsWithoutCost > 0 ? { label: `${dq.catalogProductsWithoutCost} productos sin costo configurado`, href: '/admin/costos?onlyUnassigned=1' } : null,
    dq.feeCoverage.exact < 0.99 ? { label: `Fees de Mercado Pago sin sincronizar (hoy estimados por regla)`, href: '/admin/finance/rentabilidad' } : null,
    dq.feeCoverage.missing > 0 ? { label: `${pct(dq.feeCoverage.missing)} del revenue sin regla de fee`, href: '/admin/finance/config' } : null,
    dq.coverage.shipping < 1 ? { label: `Costo real de envío sin configurar`, href: '/admin/finance/config' } : null,
    dq.coverage.variable < 1 ? { label: `Costos variables sin configurar`, href: '/admin/finance/config' } : null,
    { label: 'Meta Ads no conectado (entra en el próximo paso)', href: null },
  ].filter(Boolean) as { label: string; href: string | null }[] : [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Finanzas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Qué entra, qué cuesta y qué queda.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
            <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('costos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Tu perfil no tiene acceso a Finanzas.</div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudo calcular Finanzas. Reintentá.</div>
      ) : (
        <>
          {/* KPIs — Contribution primero, con protagonismo */}
          <SectionTitle>Resultado</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Contribution Profit" value={s ? fmtARS(s.contributionProfit) : '—'} delta={delta(s?.contributionProfit, cmp?.contributionProfit)} estimated emphasis
              sub={s ? `${pct(s.contributionMargin)} margen` : undefined} compare={cmp ? `vs ${fmtARS(cmp.contributionProfit)}` : undefined}
              info="Net Revenue − COGS − Payment Fees − Shipping Absorbed − Variable Costs. Estimado mientras falten costos. Todavía NO incluye Ads ni Operating Expenses." />
            <KpiCard label="Revenue" value={s ? fmtARS(s.revenue) : '—'} delta={delta(s?.revenue, cmp?.revenue)} compare={cmp ? `vs ${fmtARS(cmp.revenue)}` : undefined} info="Facturación de pedidos pagados en el período." />
            <KpiCard label="Gross Profit" value={s ? fmtARS(s.grossProfit) : '—'} delta={delta(s?.grossProfit, cmp?.grossProfit)} sub={s ? `${pct(s.grossMargin)} bruto` : undefined} info="Net Revenue − COGS." />
            <KpiCard label="Net Collected" value={s ? fmtARS(s.netCollected) : '—'} info="Dinero efectivamente acreditado por las pasarelas (Gross Collected − deducciones). Distinto de Contribution Profit." />
          </div>

          <FinanceSectionTitle>De Revenue a Contribution Profit</FinanceSectionTitle>
          <Waterfall rows={waterfall} />

          <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr] mt-8">
            <div>
              <FinanceSectionTitle right={<span className="text-[11px] text-muted-foreground">{dq ? `${dq.feeExactOrders} con fee exacto` : ''}</span>}>Pasarelas de pago</FinanceSectionTitle>
              <GatewayTable rows={data?.gateways || []} />
              {dq && (
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  Cobertura de fees: <span className="text-success">exacto {pct(dq.feeCoverage.exact)}</span> · configurado {pct(dq.feeCoverage.configured)}{dq.feeCoverage.missing > 0 && <> · <span className="text-warning">faltante {pct(dq.feeCoverage.missing)}</span></>}. Los fees exactos de Mercado Pago se sincronizan desde Rentabilidad.
                </p>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <FinanceSectionTitle>Calidad de datos</FinanceSectionTitle>
                <DataQualityCard rows={qualityRows} />
              </div>
              <div>
                <FinanceSectionTitle>Datos por completar</FinanceSectionTitle>
                <DataToComplete items={toComplete} />
              </div>
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground mt-8">
            <Link href="/admin/finance/rentabilidad" className="text-foreground hover:underline">Ver rentabilidad por pedido y por producto →</Link>
          </p>
        </>
      )}
    </div>
  );
}
