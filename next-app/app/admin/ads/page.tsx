'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { fmtRelative } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import type { AdvertisingSummary, CampaignRow } from '@/lib/meta/summary';
import type { BreakevenSignal } from '@/lib/meta/metrics';

interface Resp { connected: boolean; reason?: string; account?: string; summary?: AdvertisingSummary; lastUpdated?: string; stale?: boolean; error?: string }

const roas = (n: number | null) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')}×`);
const num = (n: number) => n.toLocaleString('es-AR');
const pct1 = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(1).replace('.', ',')}%`);

const SIGNAL: Record<BreakevenSignal, { label: string; cls: string }> = {
  above:   { label: 'Sobre breakeven', cls: 'bg-success-soft text-success' },
  near:    { label: 'En breakeven',    cls: 'bg-muted text-muted-foreground' },
  below:   { label: 'Bajo breakeven',  cls: 'bg-destructive/10 text-destructive' },
  unknown: { label: '—',               cls: 'bg-muted text-muted-foreground/60' },
};
const STATUS_CLS = (s?: string) => s === 'ACTIVE' ? 'text-success' : /PAUSED|ARCHIVED|DISABLED/i.test(s || '') ? 'text-muted-foreground/60' : 'text-muted-foreground';

export default function AdsPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', false));
  const [data, setData] = useState<Resp | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [openCampaign, setOpenCampaign] = useState<string | null>(null);
  const [children, setChildren] = useState<Record<string, CampaignRow[]>>({});
  const [openAdset, setOpenAdset] = useState<string | null>(null);
  const [adChildren, setAdChildren] = useState<Record<string, CampaignRow[]>>({});

  const load = useCallback(async (r: RangeState, refresh = false) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC, ...(refresh ? { refresh: '1' } : {}) });
      const res = await fetch(`/api/admin/meta/summary?${qs}`, { headers: headers() });
      const d = await res.json();
      setData(d);
      setState(d.error ? 'error' : 'ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

  async function toggleCampaign(id: string) {
    if (openCampaign === id) { setOpenCampaign(null); return; }
    setOpenCampaign(id); setOpenAdset(null);
    if (!children[id]) {
      const qs = new URLSearchParams({ campaignId: id, level: 'adset', start: range.range.startUTC, end: range.range.endUTC });
      const res = await fetch(`/api/admin/meta/drilldown?${qs}`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setChildren((p) => ({ ...p, [id]: d.rows || [] })); }
    }
  }
  async function toggleAdset(id: string) {
    if (openAdset === id) { setOpenAdset(null); return; }
    setOpenAdset(id);
    if (!adChildren[id]) {
      const qs = new URLSearchParams({ adsetId: id, level: 'ad', start: range.range.startUTC, end: range.range.endUTC });
      const res = await fetch(`/api/admin/meta/drilldown?${qs}`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setAdChildren((p) => ({ ...p, [id]: d.rows || [] })); }
    }
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

  const s = data?.summary;
  const b = s?.business;
  const p = s?.platform;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Meta Ads</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Publicidad de Meta cruzada con la economía real de Hype.
            {s?.account && <span className="text-muted-foreground/70"> · {s.account.name} · {s.account.currency}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.lastUpdated && <span className="text-[11px] text-muted-foreground">Actualizado {fmtRelative(data.lastUpdated)}</span>}
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range, true)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
            <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('costos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Tu perfil no tiene acceso a Finanzas.</div>
      ) : data && data.connected === false ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-[14px] font-semibold text-foreground">Meta no conectado</p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-md mx-auto">Agregá <code className="bg-muted px-1 rounded">META_ACCESS_TOKEN</code> (system user, read-only) y opcional <code className="bg-muted px-1 rounded">META_AD_ACCOUNT_ID</code> en el servidor. No se muestra $0 de gasto cuando está desconectado.</p>
        </div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No pudimos consultar Meta. Reintentá.</div>
      ) : !s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[88px] bg-muted/40 rounded-lg animate-pulse" />)}</div>
      ) : (
        <>
          {data?.stale && <div className="mb-4 bg-warning-soft text-warning rounded-lg px-3 py-2 text-[12px]">Mostrando el último dato válido de Meta (no pudimos actualizar).</div>}

          {/* PLATFORM (Meta atribuye) */}
          <SectionTitle right={<span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">Meta atribuye</span>}>Plataforma</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Ad Spend" value={fmtARS(p!.spend)} emphasis sub={`${num(p!.impressions)} impresiones`} info="Platform Spend exacto de Meta Insights, en la moneda de la cuenta (ARS)." />
            <KpiCard label={`Effective Ad Cost${s.ad.upliftQuality === 'missing' ? ' · Partial' : ''}`} value={fmtARS(s.ad.effective)} sub={s.ad.mixed ? `+${fmtARS(s.ad.economicUplift)} cargos` : 'impuestos pendientes'} estimated={s.ad.upliftQuality !== 'exact'} info="Platform Spend + cargos económicos NO recuperables. Sin regla de impuestos configurada = sólo spend (los impuestos no se asumen como 0 exacto)." />
            <KpiCard label="Meta ROAS" value={roas(p!.roas)} sub={`${num(p!.purchases)} compras atrib.`} info="Attributed Purchase Value / Platform Spend. Fuente Meta (omni_purchase). No es revenue contable." />
            <KpiCard label="Meta CPA" value={p!.cpa == null ? '—' : fmtARS(p!.cpa)} sub={`CTR ${pct1(p!.ctr / 100)} · CPC ${fmtARS(p!.cpc)}`} info="Platform Spend / Meta Attributed Purchases." />
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2">Meta Attributed Revenue ({fmtARS(p!.attributedValue)}) es una métrica de atribución de la plataforma — <strong className="text-foreground">no</strong> es el revenue de Woo ni se suma a él.</p>

          {/* BUSINESS + BLENDED (Hype real) */}
          <SectionTitle right={<span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">Hype real</span>}>Negocio</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="MER" value={roas(b!.mer)} emphasis sub="Woo Revenue / Effective Ad Cost" info="Marketing Efficiency Ratio: revenue REAL de Woo sobre el costo efectivo de publicidad. Distinto del Meta ROAS (que usa revenue atribuido)." />
            <KpiCard label="Contribution After Marketing" value={fmtARS(b!.contributionAfterMarketing)} sub={b!.camMargin != null ? `${pct1(b!.camMargin)} margen` : undefined} info="Contribution Profit − Effective Advertising Cost. Lo que queda después de fabricar, cobrar, entregar y adquirir las ventas." />
            <KpiCard label="Blended CAC" value={b!.blendedCac == null ? '—' : fmtARS(b!.blendedCac)} sub={b!.newCustomers != null ? `${b!.newCustomers} nuevos` : 'sin dato'} info="Effective Advertising Cost / clientes nuevos (de Woo, no purchasers de Meta)." />
            <KpiCard label="Ad Spend % Revenue" value={pct1(b!.adSpendPctRevenue)} sub={`breakeven ROAS ${roas(b!.breakevenRoas)}`} info="Effective Advertising Cost / Woo Revenue. El breakeven ROAS sale del margen de contribución real, no de benchmarks." />
          </div>

          {/* Única señal de data-quality (no un warning por card) */}
          {s.ad.upliftQuality === 'missing' && (
            <p className="text-[11px] text-warning mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
              Impuestos/cargos de publicidad pendientes de configurar → <strong className="font-medium">Effective Ad Cost, MER, Contribution After Marketing y Operating Profit son parciales</strong> (no se asume 0).
            </p>
          )}

          {/* Operating Profit Estimated */}
          <div className="bg-foreground text-background rounded-lg p-4 mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.08em] opacity-70">Operating Profit Estimated{b!.operatingProfitPartial && <span className="opacity-80"> · Partial</span>}</p>
              <p className="text-[24px] font-bold tabular-nums tracking-tight mt-0.5">{fmtARS(b!.operatingProfitEstimated)}</p>
            </div>
            <p className="text-[11px] opacity-70 max-w-md">Contribution After Marketing − Operating Expenses ({fmtARS(b!.operatingExpenses)}). No es Net Profit (sin impuestos ni contabilidad fiscal).{b!.operatingProfitPartial && ' Operating Costs incompletos.'}</p>
            <Link href="/admin/finance" className="ml-auto text-[12px] underline opacity-80 hover:opacity-100">Ver Finanzas →</Link>
          </div>

          {/* Campañas */}
          <SectionTitle>Campañas</SectionTitle>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    <th className="text-left font-medium px-3 py-2">Campaña</th>
                    <th className="text-right font-medium px-3 py-2">Spend</th>
                    <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Compras</th>
                    <th className="text-right font-medium px-3 py-2 hidden md:table-cell">Meta Rev.</th>
                    <th className="text-right font-medium px-3 py-2">ROAS</th>
                    <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">CPA</th>
                    <th className="text-right font-medium px-3 py-2">Señal</th>
                  </tr>
                </thead>
                <tbody>
                  {s.campaigns.map((c) => (
                    <Fragment key={c.id}>
                      <tr onClick={() => c.campaignId && toggleCampaign(c.campaignId)} className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ChevronRight size={13} className={`text-muted-foreground/50 transition-transform ${openCampaign === c.campaignId ? 'rotate-90' : ''}`} />
                            <div className="min-w-0">
                              <p className="text-foreground truncate max-w-[240px]">{c.name}</p>
                              <p className={`text-[11px] ${STATUS_CLS(c.status)}`}>{c.status || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmtARS(c.spend)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{c.purchases}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtARS(c.purchaseValue)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{roas(c.roas)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{c.cpa == null ? '—' : fmtARS(c.cpa)}</td>
                        <td className="px-3 py-2.5 text-right"><span className={`inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 ${SIGNAL[c.signal].cls}`}>{SIGNAL[c.signal].label}</span></td>
                      </tr>
                      {openCampaign === c.campaignId && (children[c.campaignId!] || []).map((as) => (
                        <Fragment key={as.adsetId || as.id}>
                          <tr onClick={() => as.adsetId && toggleAdset(as.adsetId)} className="border-b border-border last:border-0 bg-muted/20 text-[12px] cursor-pointer hover:bg-muted/40">
                            <td className="pl-7 pr-3 py-2 text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <ChevronRight size={12} className={`text-muted-foreground/40 transition-transform ${openAdset === as.adsetId ? 'rotate-90' : ''}`} />
                                <span className="truncate max-w-[220px]">{as.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtARS(as.spend)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{as.purchases}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmtARS(as.purchaseValue)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{roas(as.roas)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{as.cpa == null ? '—' : fmtARS(as.cpa)}</td>
                            <td />
                          </tr>
                          {openAdset === as.adsetId && (adChildren[as.adsetId!] || []).map((ad) => (
                            <tr key={ad.id} className="border-b border-border last:border-0 bg-muted/30 text-[12px]">
                              <td className="pl-12 pr-3 py-1.5 text-muted-foreground/80 truncate max-w-[240px]">{ad.name} <span className="text-[10px] text-muted-foreground/50">{ad.status}</span></td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground/80">{fmtARS(ad.spend)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground/80 hidden sm:table-cell">{ad.purchases}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground/80 hidden md:table-cell">{fmtARS(ad.purchaseValue)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground/80">{roas(ad.roas)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground/80 hidden sm:table-cell">{ad.cpa == null ? '—' : fmtARS(ad.cpa)}</td>
                              <td />
                            </tr>
                          ))}
                          {openAdset === as.adsetId && !adChildren[as.adsetId!] && (
                            <tr><td colSpan={7} className="pl-12 py-1.5 text-[11px] text-muted-foreground animate-pulse">Cargando ads…</td></tr>
                          )}
                        </Fragment>
                      ))}
                      {openCampaign === c.campaignId && !children[c.campaignId!] && (
                        <tr><td colSpan={7} className="px-8 py-2 text-[11px] text-muted-foreground animate-pulse">Cargando ad sets…</td></tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            La señal compara <strong className="text-foreground">Meta ROAS</strong> vs el <strong className="text-foreground">breakeven del negocio</strong> ({roas(b!.breakevenRoas)}, derivado del margen de contribución). No es profit contable por campaña — Meta atribuye compras, no asigna el profit real de Woo.
          </p>
        </>
      )}
    </div>
  );
}
