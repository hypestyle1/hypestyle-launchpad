'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, X, Plus } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { SourceBadge, FinanceSectionTitle, pct } from '@/components/admin/finance/blocks';
import {
  CATEGORY_LABEL, type OperatingCost, type OperatingSummary, type ComputedCost,
  type Currency, type Category, type CostType, type Frequency,
} from '@/lib/finance/operating-costs';
import { newCostId, newPeriodId } from '@/lib/finance/operating-costs-defaults';

const FREQ_LABEL: Record<Frequency, string> = { monthly: 'Mensual', annual: 'Anual', weekly: 'Semanal', daily: 'Diario', usage: 'Uso', one_off: 'Único' };
const TYPE_LABEL: Record<CostType, string> = { fixed: 'Fijo', variable: 'Variable', semi_variable: 'Semi-variable', one_off: 'Único' };
const QUALITY_SOURCE: Record<string, 'exact' | 'configured' | 'missing'> = { exact: 'exact', configured: 'configured', estimated: 'configured', missing: 'missing' };

function fmtCur(amount: number | null, currency: Currency): string {
  if (amount == null) return '—';
  if (currency === 'ARS') return fmtARS(amount);
  const sym = currency === 'USD' ? 'US$' : '€';
  return `${sym} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function OperatingCostsPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', false));
  const [summary, setSummary] = useState<OperatingSummary | null>(null);
  const [costs, setCosts] = useState<OperatingCost[]>([]);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');
  const [edit, setEdit] = useState<OperatingCost | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback(async (r: RangeState) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC });
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/admin/finance/operating-costs/summary?${qs}`, { headers: headers() }),
        fetch(`/api/admin/finance/operating-costs`, { headers: headers() }),
      ]);
      if (!sRes.ok) throw new Error();
      const sData = await sRes.json();
      const cData = await cRes.json();
      setSummary(sData.summary);
      setPersisted(sData.persisted);
      setCosts(cData.costs || []);
      setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

  const rows: ComputedCost[] = useMemo(() => {
    const items = summary?.items || [];
    return items.filter((i) => {
      if (catFilter !== 'all' && i.category !== catFilter) return false;
      if (search && !(`${i.name} ${i.provider}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    }).sort((a, b) => b.ars - a.ars);
  }, [summary, catFilter, search]);

  async function saveCost(next: OperatingCost) {
    // Merge por id en la lista y persistir el array completo.
    const list = costs.some((c) => c.id === next.id) ? costs.map((c) => (c.id === next.id ? next : c)) : [...costs, next];
    setSaveMsg('Guardando…');
    try {
      const res = await fetch('/api/admin/finance/operating-costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ costs: list }),
      });
      if (res.status === 501) { const d = await res.json(); setSaveMsg(d.hint || 'Backend pendiente de deploy'); return; }
      if (!res.ok) throw new Error();
      setSaveMsg('Guardado'); setEdit(null);
      load(range);
      setTimeout(() => setSaveMsg(''), 2500);
    } catch { setSaveMsg('Error al guardar'); }
  }

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

  const s = summary;

  const cols: Column<ComputedCost>[] = [
    { key: 'name', header: 'Costo', render: (c) => <span className="font-medium text-foreground">{c.name}</span> },
    { key: 'provider', header: 'Proveedor', hideOnMobile: true, render: (c) => <span className="text-muted-foreground">{c.provider}</span> },
    { key: 'cat', header: 'Categoría', hideOnMobile: true, render: (c) => <span className="text-muted-foreground text-[12px]">{CATEGORY_LABEL[c.category]}</span> },
    { key: 'type', header: 'Tipo', hideOnMobile: true, render: (c) => <span className="text-muted-foreground text-[12px]">{TYPE_LABEL[c.costType]}</span> },
    { key: 'orig', header: 'Original', align: 'right', render: (c) => <span className="tabular-nums text-muted-foreground">{c.hasMissing && c.ars === 0 ? '—' : c.original ? fmtCur(c.original.amount, c.original.currency) : 'mixto'}</span> },
    { key: 'ars', header: 'ARS', align: 'right', render: (c) => c.hasMissing && c.ars === 0 ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-foreground">{fmtARS(c.ars)}</span> },
    { key: 'freq', header: 'Frecuencia', hideOnMobile: true, render: (c) => <span className="text-muted-foreground text-[12px]">{FREQ_LABEL[c.frequency]}</span> },
    { key: 'q', header: 'Calidad', align: 'center', render: (c) => <SourceBadge source={QUALITY_SOURCE[c.hasMissing && c.ars === 0 ? 'missing' : c.quality]} /> },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Costos operativos</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Lo que cuesta mantener Hype funcionando. No incluye COGS, comisiones ni envío.</p>
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
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudo calcular Costos operativos. Reintentá.</div>
      ) : !s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[88px] bg-muted/40 rounded-lg animate-pulse" />)}</div>
      ) : (
        <>
          {persisted === false && (
            <div className="mb-4 flex items-center gap-2 bg-muted text-muted-foreground rounded-lg px-3 py-2 text-[12px]">
              Mostrando los costos confirmados por defecto (n8n, Upstash) y observados. Todavía no guardaste ningún cambio — al guardar cualquier costo se persisten todos.
            </div>
          )}

          {/* Hero */}
          <SectionTitle>Operating Expenses</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Operating Expenses" value={fmtARS(s.totalARS)} emphasis sub={`${s.itemCount} costos`}
              info="Suma de todos los costos operativos del período, prorrateados y convertidos a ARS. No incluye COGS, gateway fees, shipping ni Paid Media." />
            <KpiCard label="Costos fijos" value={fmtARS(s.fixedARS)} sub={`${pct(s.totalARS ? s.fixedARS / s.totalARS : 0)} del total`} info="SaaS y suscripciones recurrentes, prorrateados por día." />
            <KpiCard label="Costos variables" value={fmtARS(s.variableARS)} sub="uso (AI, APIs)" info="Costos por uso: Anthropic, OpenAI. Escalan con la actividad, no con el calendario." />
            <KpiCard label="SaaS / Infra" value={fmtARS(s.saasInfraARS)} sub="tech + infra + automation" info="Technology + Infrastructure + Automation." />
          </div>

          {/* Bot economics + Data quality */}
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr] mt-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-foreground">Bot economics</h3>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">dinero, no capacidad</span>
                </div>
                <Link href="/admin/bot" className="text-[12px] text-muted-foreground hover:text-foreground">Ver capacidad del bot →</Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">Costo del bot</p>
                  <p className="text-[19px] font-bold text-foreground tabular-nums mt-1">{fmtARS(s.bot.totalARS)}</p>
                  {s.bot.totalUSDApprox !== null && <p className="text-[11px] text-muted-foreground/70 tabular-nums">≈ US$ {s.bot.totalUSDApprox.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>}
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">Fijo</p>
                  <p className="text-[19px] font-bold text-foreground tabular-nums mt-1">{fmtARS(s.bot.fixedARS)}</p>
                  <p className="text-[11px] text-muted-foreground/70">n8n · Upstash</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">Uso</p>
                  <p className="text-[19px] font-bold text-foreground tabular-nums mt-1">{fmtARS(s.bot.usageARS)}</p>
                  <p className="text-[11px] text-muted-foreground/70">Anthropic · OpenAI</p>
                </div>
              </div>
              {s.bot.fixedPct !== null && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted mb-1.5">
                    <div className="bg-foreground" style={{ width: `${s.bot.fixedPct * 100}%` }} title="Fijo" />
                    <div className="bg-warning" style={{ width: `${(1 - s.bot.fixedPct) * 100}%` }} title="Uso" />
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    <span className="text-foreground font-medium">{pct(s.bot.fixedPct)}</span> del costo del bot es fijo — duplicar mensajes no duplica el costo total.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              {/* Inventory Completeness — SEPARADO de la calidad monetaria. Un costo
                  sin monto no desaparece: se cuenta acá, nunca como $0. */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[12px] font-medium text-foreground">Inventario</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{s.inventory.known} / {s.inventory.total} costos con monto</span>
              </div>
              <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted mb-1">
                <div className="bg-foreground" style={{ width: `${s.inventory.total ? (s.inventory.known / s.inventory.total) * 100 : 0}%` }} title="Con monto" />
                <div className="bg-warning" style={{ width: `${s.inventory.total ? (s.inventory.missing / s.inventory.total) * 100 : 0}%` }} title="Sin monto" />
              </div>
              {s.inventory.missing > 0 && <p className="text-[11px] text-warning mb-3">{s.inventory.missing} costo{s.inventory.missing > 1 ? 's' : ''} sin monto — cargar para completar el total.</p>}

              <div className="pt-3 mt-1 border-t border-border">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[12px] font-medium text-foreground">Calidad del costo conocido</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">exacto {pct(s.quality.exact)} · config {pct(s.quality.configured)} · estim {pct(s.quality.estimated)}</span>
                </div>
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
                  <div className="bg-success" style={{ width: `${s.quality.exact * 100}%` }} title="Exacto" />
                  <div className="bg-foreground/45" style={{ width: `${s.quality.configured * 100}%` }} title="Configurado" />
                  <div className="bg-warning" style={{ width: `${s.quality.estimated * 100}%` }} title="Estimado" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-2">Sobre los montos conocidos, no sobre el total. FX {s.fxQuality === 'configured' ? 'del mes (configured)' : 'histórico estimado'}: US$ = ${s.fxUSD.toLocaleString('es-AR')}.</p>
            </div>
          </div>

          {/* Breakdown por categoría */}
          {s.byCategory.length > 0 && (
            <>
              <FinanceSectionTitle>Por categoría</FinanceSectionTitle>
              <div className="bg-card border border-border rounded-lg p-4 space-y-2.5">
                {s.byCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-[12.5px] text-foreground w-40 shrink-0">{c.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/70" style={{ width: `${c.pct * 100}%` }} /></div>
                    <span className="text-[12px] text-muted-foreground tabular-nums w-14 text-right">{pct(c.pct)}</span>
                    <span className="text-[12.5px] text-foreground tabular-nums w-28 text-right">{fmtARS(c.ars)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Tabla de costos */}
          <div className="flex items-center justify-between mb-3 mt-8">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">Todos los costos</h2>
            <div className="flex items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[12px] w-[140px] focus:outline-none focus:border-border-mid" />
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)} className="border border-border bg-card text-foreground rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:border-border-mid">
                <option value="all">Todas</option>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={() => setEdit(blankCost())} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1"><Plus size={13} /> Nuevo</button>
            </div>
          </div>
          <DataTable columns={cols} rows={rows} keyOf={(c) => c.id} onRowClick={(c) => setEdit(costs.find((x) => x.id === c.id) || null)} emptyTitle="Sin costos" />

          {saveMsg && <p className={`text-[12px] mt-3 ${saveMsg === 'Guardado' ? 'text-success' : saveMsg.includes('Error') || saveMsg.includes('pendiente') || saveMsg.includes('Backend') ? 'text-warning' : 'text-muted-foreground'}`}>{saveMsg}</p>}
        </>
      )}

      {edit && <CostEditor cost={edit} onClose={() => setEdit(null)} onSave={saveCost} />}
    </div>
  );
}

function blankCost(): OperatingCost {
  return {
    id: newCostId(), name: '', provider: '', category: 'other', costType: 'fixed', frequency: 'monthly',
    profitLevel: 'operating', source: 'manual', quality: 'configured', taxTreatment: 'economic_cost', active: true,
    periods: [{ id: newPeriodId(), amount: null, currency: 'USD', validFrom: new Date().toISOString().slice(0, 10), validTo: null }],
  };
}

// ── Editor (drawer) ──────────────────────────────────────────────────────────
function CostEditor({ cost, onClose, onSave }: { cost: OperatingCost; onClose: () => void; onSave: (c: OperatingCost) => void }) {
  const [c, setC] = useState<OperatingCost>(cost);
  const set = (patch: Partial<OperatingCost>) => setC((p) => ({ ...p, ...patch }));
  const setPeriod = (id: string, patch: Partial<OperatingCost['periods'][number]>) =>
    setC((p) => ({ ...p, periods: p.periods.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addPeriod = () => setC((p) => ({ ...p, periods: [...p.periods, { id: newPeriodId(), amount: null, currency: p.periods[0]?.currency || 'USD', validFrom: new Date().toISOString().slice(0, 10), validTo: null }] }));
  const removePeriod = (id: string) => setC((p) => ({ ...p, periods: p.periods.filter((x) => x.id !== id) }));

  const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-background h-full overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-foreground">{cost.name ? 'Editar costo' : 'Nuevo costo'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Nombre<input className={inputCls} value={c.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="text-[11px] text-muted-foreground">Proveedor<input className={inputCls} value={c.provider} onChange={(e) => set({ provider: e.target.value })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Categoría
              <select className={inputCls} value={c.category} onChange={(e) => set({ category: e.target.value as Category })}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label className="text-[11px] text-muted-foreground">Tipo
              <select className={inputCls} value={c.costType} onChange={(e) => set({ costType: e.target.value as CostType })}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">Frecuencia
              <select className={inputCls} value={c.frequency} onChange={(e) => set({ frequency: e.target.value as Frequency })}>
                {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label className="text-[11px] text-muted-foreground">Calidad
              <select className={inputCls} value={c.quality} onChange={(e) => set({ quality: e.target.value as any })}>
                {['exact', 'configured', 'estimated', 'missing'].map((q) => <option key={q} value={q}>{q}</option>)}
              </select></label>
          </div>

          {/* Vigencias */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Vigencias de precio</span>
              <button onClick={addPeriod} className="text-[12px] text-foreground/80 hover:text-foreground flex items-center gap-1"><Plus size={12} /> Vigencia</button>
            </div>
            <div className="space-y-2">
              {c.periods.map((p) => (
                <div key={p.id} className="border border-border rounded-lg p-2.5 bg-card">
                  <div className="flex items-center gap-2 mb-1.5">
                    <input type="number" placeholder="Monto" value={p.amount ?? ''} onChange={(e) => setPeriod(p.id, { amount: e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value)) })} className="w-24 border border-border bg-card text-foreground rounded-md px-2 py-1 text-[13px] text-right tabular-nums" />
                    <select value={p.currency} onChange={(e) => setPeriod(p.id, { currency: e.target.value as Currency })} className="border border-border bg-card text-foreground rounded-md px-1.5 py-1 text-[12px]">
                      {['USD', 'ARS', 'EUR'].map((cy) => <option key={cy} value={cy}>{cy}</option>)}
                    </select>
                    <span className="text-[11px] text-muted-foreground/60">{p.amount == null ? 'sin monto (missing)' : ''}</span>
                    {c.periods.length > 1 && <button onClick={() => removePeriod(p.id)} className="ml-auto text-muted-foreground/50 hover:text-destructive"><X size={14} /></button>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <label className="flex items-center gap-1">Desde <input type="date" value={p.validFrom} onChange={(e) => setPeriod(p.id, { validFrom: e.target.value })} className="border border-border bg-card text-foreground rounded-md px-1.5 py-0.5 text-[12px]" /></label>
                    <label className="flex items-center gap-1">Hasta <input type="date" value={p.validTo ?? ''} onChange={(e) => setPeriod(p.id, { validTo: e.target.value || null })} className="border border-border bg-card text-foreground rounded-md px-1.5 py-0.5 text-[12px]" /></label>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">Cambiar un precio: cerrá la vigencia anterior (Hasta) y agregá una nueva. No se reescribe el pasado.</p>
          </div>

          <label className="flex items-center gap-2 text-[12px] text-foreground pt-1"><input type="checkbox" checked={c.active} onChange={(e) => set({ active: e.target.checked })} /> Activo</label>

          <div className="flex items-center gap-2 pt-3">
            <button onClick={() => onSave(c)} disabled={!c.name.trim()} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-[13px] font-semibold disabled:opacity-50">Guardar</button>
            {c.active && <button onClick={() => onSave({ ...c, active: false })} className="text-[12px] text-muted-foreground hover:text-destructive ml-auto">Desactivar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
