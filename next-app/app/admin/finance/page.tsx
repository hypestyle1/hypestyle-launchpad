'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { Waterfall, GatewayTable, DataToComplete, DataQualityCard, FinanceSectionTitle, DeductionsTable, DateBaseToggle, pct, type WaterfallRow, type GatewayRow, type QualityRow, type DeductionRow, type DateBaseId } from '@/components/admin/finance/blocks';
import type { FinanceSummary } from '@/lib/finance/calculations';
import type { OperatingSummary } from '@/lib/finance/operating-costs';

interface SummaryResp {
  base?: DateBaseId;
  summary: FinanceSummary;
  previous: FinanceSummary | null;
  gateways: GatewayRow[];
  dataQuality: { coverage: { cogs: number; fees: number; shipping: number; variable: number }; feeCoverage: { exact: number; configured: number; missing: number }; feeExactOrders: number; catalogProductsWithoutCost: number };
}

export default function FinanceResumen() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', true));
  const [base, setBase] = useState<DateBaseId>('sale');
  const [data, setData] = useState<SummaryResp | null>(null);
  const [op, setOp] = useState<OperatingSummary | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = useCallback(async (r: RangeState, b: DateBaseId) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC, compare: r.compare ? '1' : '0', base: b });
      const res = await fetch(`/api/admin/finance/summary?${qs}`, { headers: headers() });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setState('ok');
    } catch { setState('error'); }
    // Capa operativa (aparte, no bloquea el resumen principal).
    setOp(null); setMeta(null);
    const qsOp = `start=${encodeURIComponent(r.range.startUTC)}&end=${encodeURIComponent(r.range.endUTC)}`;
    fetch(`/api/admin/finance/operating-costs/summary?${qsOp}`, { headers: headers() })
      .then((x) => (x.ok ? x.json() : null)).then((d) => d && setOp(d.summary)).catch(() => {});
    fetch(`/api/admin/meta/summary?${qsOp}`, { headers: headers() })
      .then((x) => (x.ok ? x.json() : null)).then((d) => d && d.connected && d.summary && setMeta(d.summary)).catch(() => {});
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range, base); }, [autorizado, range, base, load]);

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
    { label: 'Comisión de pasarela', amount: s.deductions.gateway + s.deductions.other, kind: 'subtract', source: (dq && dq.feeCoverage.exact > 0) ? 'exact' : 'configured', hint: dq ? `exacto ${pct(dq.feeCoverage.exact)} · configurado ${pct(dq.feeCoverage.configured)} · fee ef. ${pct(s.effectiveFeeRate)}` : undefined },
    { label: 'Financiación', amount: s.deductions.financing > 0 ? s.deductions.financing : null, kind: 'subtract', source: s.deductions.financing > 0 ? 'exact' : 'missing', hint: 'cuotas sin interés absorbidas · sólo con dato exacto de MP' },
    { label: 'Retenciones', amount: s.taxWithholdings > 0 ? s.taxWithholdings : null, kind: 'subtract', source: s.taxWithholdings > 0 ? 'exact' : 'missing', hint: 'IIBB / SIRTAC descontado por la pasarela · se trata como costo' },
    { label: 'Shipping Absorbed', amount: dq && dq.coverage.shipping > 0 ? s.shippingAbsorbed : null, kind: 'subtract', source: dq && dq.coverage.shipping > 0 ? 'configured' : 'missing' },
    { label: 'Variable Costs', amount: dq && dq.coverage.variable > 0 ? s.variableCosts : null, kind: 'subtract', source: dq && dq.coverage.variable > 0 ? 'configured' : 'missing' },
    { label: 'Contribution Profit', amount: s.contributionProfit, kind: 'result', hint: `margen de contribución ${pct(s.contributionMargin)} · estimado` },
  ] : [];

  const deductionRows: DeductionRow[] = s ? [
    { label: 'Comisión Mercado Pago y otras pasarelas', amount: s.deductions.gateway, share: s.revenue > 0 ? s.deductions.gateway / s.revenue : 0, source: dq && dq.feeCoverage.exact >= 0.99 ? 'exact' : 'configured', hint: dq && dq.feeCoverage.configured > 0 ? `${pct(dq.feeCoverage.configured)} del bruto estimado por regla` : undefined },
    { label: 'Financiación de cuotas', amount: s.deductions.financing, share: s.revenue > 0 ? s.deductions.financing / s.revenue : 0, source: 'exact', hint: 'Intereses de cuotas sin interés que absorbe Hype' },
    { label: 'Retención de Ingresos Brutos', amount: s.deductions.taxWithholdings, share: s.revenue > 0 ? s.deductions.taxWithholdings / s.revenue : 0, source: 'exact', hint: 'SIRTAC, descontada por MP en cada cobro desde fines de agosto 2026' },
    { label: 'Otros cargos de pasarela', amount: s.deductions.other, share: s.revenue > 0 ? s.deductions.other / s.revenue : 0, source: 'exact' },
    { label: 'Reembolsos', amount: s.deductions.refunds, share: s.revenue > 0 ? s.deductions.refunds / s.revenue : 0, source: 'exact' },
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
    !meta ? { label: 'Meta Ads no conectado', href: '/admin/ads' } : null,
  ].filter(Boolean) as { label: string; href: string | null }[] : [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Finanzas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Qué entra, qué cuesta y qué queda.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateBaseToggle value={base} onChange={setBase} />
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range, base)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
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
          {/* Qué entra: bruto vs neto real, con la cobertura del dato exacto */}
          <SectionTitle>Ingresos</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Facturación bruta" value={s ? fmtARS(s.revenue) : '—'} delta={delta(s?.revenue, cmp?.revenue)} compare={cmp ? `vs ${fmtARS(cmp.revenue)}` : undefined} emphasis
              sub={s ? `${s.orders} pedidos${base === 'release' ? ' · por acreditación' : ''}` : undefined}
              info={base === 'release' ? 'Total de los pedidos cuya plata quedó disponible en el período (fecha de liberación de la pasarela).' : 'Total de los pedidos pagados creados en el período. Fuente: WooCommerce.'} />
            <KpiCard label="Ingreso neto real" value={s ? fmtARS(s.netIncome) : '—'} delta={delta(s?.netIncome, cmp?.netIncome)} compare={cmp ? `vs ${fmtARS(cmp.netIncome)}` : undefined} emphasis
              estimated={!!dq && dq.feeCoverage.exact < 0.99}
              sub={s && dq ? `${pct(s.netIncomeRate)} del bruto · ${pct(dq.feeCoverage.exact)} con dato exacto` : undefined}
              info="Lo que quedó disponible después de comisión, financiación, retenciones y reembolsos. Con snapshot de Mercado Pago es el neto que informó MP; el resto se estima por regla configurada." />
          </div>

          <FinanceSectionTitle>Deducciones del período</FinanceSectionTitle>
          {s && <DeductionsTable rows={deductionRows} gross={s.revenue} net={s.netIncome} exactShare={dq ? dq.feeCoverage.exact : 0} />}

          {/* KPIs — Contribution primero, con protagonismo */}
          <SectionTitle>Resultado</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Contribution Profit" value={s ? fmtARS(s.contributionProfit) : '—'} delta={delta(s?.contributionProfit, cmp?.contributionProfit)} estimated emphasis
              sub={s ? `${pct(s.contributionMargin)} margen` : undefined} compare={cmp ? `vs ${fmtARS(cmp.contributionProfit)}` : undefined}
              info="Net Revenue − COGS − Comisión − Financiación − Retenciones − Shipping Absorbed − Variable Costs. Estimado mientras falten costos. Todavía NO incluye Ads ni Operating Expenses." />
            <KpiCard label="Gross Profit" value={s ? fmtARS(s.grossProfit) : '—'} delta={delta(s?.grossProfit, cmp?.grossProfit)} sub={s ? `${pct(s.grossMargin)} bruto` : undefined} info="Net Revenue − COGS." />
            <KpiCard label="Costo de cobrar" value={s ? fmtARS(s.paymentFees + s.taxWithholdings) : '—'} sub={s && s.revenue > 0 ? `${pct((s.paymentFees + s.taxWithholdings) / s.revenue)} del bruto` : undefined} positiveIsGood={false}
              info="Comisión + financiación + otros cargos + retenciones. Lo que se va entre que el cliente paga y la plata queda disponible." />
            <KpiCard label="Net Collected" value={s ? fmtARS(s.netCollected) : '—'} info="Dinero acreditado por las pasarelas antes de reembolsos fuera de snapshot. Igual a Ingreso neto real salvo reembolsos manuales." />
          </div>

          <FinanceSectionTitle>De Revenue a Contribution Profit</FinanceSectionTitle>
          <Waterfall rows={waterfall} />

          {/* Capa operativa. Con Meta conectado se activa el stack completo hasta
              Operating Profit Estimated; sin Meta, Result before Paid Media. */}
          {op && s && (
            <>
              <FinanceSectionTitle right={<Link href={meta ? '/admin/ads' : '/admin/finance/operating-costs'} className="text-[11px] text-muted-foreground hover:text-foreground">{meta ? 'Ver Meta Ads →' : 'Ver costos operativos →'}</Link>}>Capa operativa{meta ? ' + Paid Media' : ''}</FinanceSectionTitle>
              <div className="bg-card border border-border rounded-lg p-4">
                {meta ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <FStat label="Contribution Profit" value={fmtARS(s.contributionProfit)} />
                    <FOp>−</FOp>
                    <FStat label="Effective Ad Cost" value={fmtARS(meta.ad.effective)} />
                    <FOp>=</FOp>
                    <FStat label="Contribution After Marketing" value={fmtARS(meta.business.contributionAfterMarketing)} emphasis />
                    <FOp>−</FOp>
                    <FStat label="Operating Expenses" value={fmtARS(op.totalARS)} />
                    <FOp>=</FOp>
                    <FStat label={`Operating Profit Estimated${op.missingCount > 0 ? ' · Partial' : ''}`} value={fmtARS(meta.business.operatingProfitEstimated)} emphasis />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <FStat label="Contribution Profit" value={fmtARS(s.contributionProfit)} />
                    <FOp>−</FOp>
                    <FStat label="Operating Expenses" value={fmtARS(op.totalARS)} />
                    <FOp>=</FOp>
                    <FStat label={`Result before Paid Media${op.missingCount > 0 ? ' · Partial' : ''}`} value={fmtARS(s.contributionProfit - op.totalARS)} />
                    <span className="ml-auto bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium">Paid Media pendiente — Meta (Paso 03)</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-3">
                  {meta
                    ? <><strong className="text-foreground">Operating Profit Estimated</strong> = Contribution After Marketing − Operating Expenses. No es <em>Net Profit</em>.{op.missingCount > 0 && ` ${op.missingCount} operating costs sin monto → parcial.`} Meta ROAS y MER son preguntas distintas (ver Ads).</>
                    : <><strong className="text-foreground">Operating Profit Estimated</strong> se activa al conectar Meta: <em>Result before Paid Media − Effective Advertising Cost</em>. No es <em>Net Profit</em>.</>}
                </p>
              </div>
            </>
          )}

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

// Pieza chica del stack financiero (label + valor), con realce opcional.
function FStat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">{label}</p>
      <p className={`font-bold text-foreground tabular-nums mt-0.5 tracking-tight ${emphasis ? 'text-[19px]' : 'text-[16px]'}`}>{value}</p>
    </div>
  );
}
function FOp({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground text-[15px]">{children}</span>;
}
