'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { KpiCard, SectionTitle } from '@/components/admin/dashboard/blocks';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { TrafficChart, type TrafficKey } from '@/components/admin/analytics/TrafficChart';
import type { AnalyticsSummaryResponse } from '@/lib/ga4/summary';
import type { GaCampaign, GaChannel, GaLanding } from '@/lib/ga4/reports';
import type { PautaRow } from '@/lib/ga4/join';

// Tráfico del sitio (GA4) cruzado con la pauta (Meta). GA dice qué pasó en el
// sitio con el tráfico que cada campaña compró; Meta dice cuánto costó y qué
// atribuye. Se muestran lado a lado, nunca sumados.

const num = (n: number) => Math.round(n).toLocaleString('es-AR');
const pct = (n: number | null | undefined, d = 1) => (n == null ? '—' : `${(n * 100).toFixed(d).replace('.', ',')}%`);
const roas = (n: number | null) => (n == null ? '—' : `${n.toFixed(2).replace('.', ',')}×`);
const secs = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const STATUS_CLS = (s?: string) => (s === 'ACTIVE' ? 'text-success' : /PAUSED|ARCHIVED|DISABLED/i.test(s || '') ? 'text-muted-foreground/60' : 'text-muted-foreground');

const CHART_METRICS: { key: TrafficKey; label: string }[] = [
  { key: 'sessions', label: 'Sesiones' }, { key: 'activeUsers', label: 'Usuarios' }, { key: 'purchases', label: 'Compras (GA)' },
];

function EngagementCell({ rate }: { rate: number | null }) {
  if (rate == null) return <span className="text-muted-foreground">—</span>;
  const cls = rate >= 0.6 ? 'text-success' : rate < 0.35 ? 'text-destructive' : 'text-foreground';
  return <span className={`tabular-nums ${cls}`}>{pct(rate, 0)}</span>;
}

function FunnelBar({ label, count, max, rate }: { label: string; count: number; max: number; rate?: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-foreground rounded-full" style={{ width: max ? `${Math.max(1, (count / max) * 100)}%` : '0%' }} />
      </div>
      <span className="text-[13px] font-semibold text-foreground w-16 text-right shrink-0 tabular-nums">{num(count)}</span>
      <span className="text-[11px] text-muted-foreground w-12 text-right shrink-0 tabular-nums">{rate == null ? '' : pct(rate, 0)}</span>
    </div>
  );
}

export default function TraficoPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', false));
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [metric, setMetric] = useState<TrafficKey>('sessions');

  const load = useCallback(async (r: RangeState, refresh = false) => {
    if (!puede('costos')) return;
    setState('loading');
    try {
      const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC, ...(refresh ? { refresh: '1' } : {}) });
      const res = await fetch(`/api/admin/analytics/summary?${qs}`, { headers: headers() });
      const d = await res.json();
      setData(d);
      setState(d.error ? 'error' : 'ok');
    } catch { setState('error'); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

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

  const rep = data?.report;
  const t = rep?.totals;
  const f = rep?.funnel;
  const pauta = data?.pauta;
  const sessionConv = t && t.sessions > 0 ? t.purchases / t.sessions : null;
  const cartRate = t && f && t.sessions > 0 ? f.addToCart / t.sessions : null;

  const pautaCols: Column<PautaRow>[] = [
    { key: 'name', header: 'Campaña', render: (r) => (
      <div className="min-w-0">
        <p className="text-foreground truncate max-w-[240px]">{r.name}</p>
        <p className="text-[11px] truncate max-w-[240px]"><span className={STATUS_CLS(r.status)}>{r.status || '—'}</span>{r.gaNames.length ? <span className="text-muted-foreground/60"> · utm: {r.gaNames.join(', ')}</span> : <span className="text-warning"> · sin utm en GA</span>}</p>
      </div>
    ) },
    { key: 'spend', header: 'Spend', align: 'right', render: (r) => <span className="tabular-nums text-foreground">{fmtARS(r.spend)}</span> },
    { key: 'clicks', header: 'Clicks', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.clicks)}</span> },
    { key: 'sessions', header: 'Sesiones', align: 'right', render: (r) => <span className="tabular-nums text-foreground font-medium">{num(r.sessions)}</span> },
    { key: 'cps', header: 'Costo/sesión', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{r.costPerSession == null ? '—' : fmtARS(r.costPerSession)}</span> },
    { key: 'eng', header: 'Interacción', align: 'right', render: (r) => <EngagementCell rate={r.engagementRate} /> },
    { key: 'atc', header: 'Carritos', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.addToCarts)}</span> },
    { key: 'gap', header: 'Compras GA', align: 'right', render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.gaPurchases)}</span> },
    { key: 'mp', header: 'Compras Meta', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.metaPurchases)}</span> },
    { key: 'roas', header: 'ROAS Meta', align: 'right', render: (r) => <span className="tabular-nums text-foreground">{roas(r.metaRoas)}</span> },
  ];

  const channelCols: Column<GaChannel>[] = [
    { key: 'channel', header: 'Canal', render: (r) => <span className="text-foreground">{r.channel}</span> },
    { key: 'sessions', header: 'Sesiones', align: 'right', render: (r) => <span className="tabular-nums text-foreground font-medium">{num(r.sessions)}</span> },
    { key: 'users', header: 'Usuarios', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.activeUsers)}</span> },
    { key: 'eng', header: 'Interacción', align: 'right', render: (r) => <EngagementCell rate={r.engagementRate} /> },
    { key: 'p', header: 'Compras GA', align: 'right', render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.purchases)}</span> },
    { key: 'rev', header: 'Revenue GA', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{fmtARS(r.purchaseRevenue)}</span> },
  ];

  const otherCols: Column<GaCampaign>[] = [
    { key: 'c', header: 'Etiqueta (utm_campaign)', render: (r) => (
      <div className="min-w-0"><p className="text-foreground truncate max-w-[220px]">{r.campaign || '(vacío)'}</p><p className="text-[11px] text-muted-foreground/70 truncate max-w-[220px]">{r.sourceMedium}</p></div>
    ) },
    { key: 'sessions', header: 'Sesiones', align: 'right', render: (r) => <span className="tabular-nums text-foreground font-medium">{num(r.sessions)}</span> },
    { key: 'eng', header: 'Interacción', align: 'right', render: (r) => <EngagementCell rate={r.engagementRate} /> },
    { key: 'atc', header: 'Carritos', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.addToCarts)}</span> },
    { key: 'p', header: 'Compras GA', align: 'right', render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.purchases)}</span> },
  ];

  const landingCols: Column<GaLanding>[] = [
    { key: 'page', header: 'Landing', render: (r) => <span className="text-foreground font-mono text-[12px] truncate block max-w-[260px]">{r.page}</span> },
    { key: 'sessions', header: 'Sesiones', align: 'right', render: (r) => <span className="tabular-nums text-foreground font-medium">{num(r.sessions)}</span> },
    { key: 'eng', header: 'Interacción', align: 'right', render: (r) => <EngagementCell rate={r.engagementRate} /> },
    { key: 'p', header: 'Compras', align: 'right', hideOnMobile: true, render: (r) => <span className="tabular-nums text-muted-foreground">{num(r.purchases)}</span> },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Tráfico</h1>
            {data?.connected && rep && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-success-soft text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" />Conectado</span>}
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">Google Analytics 4 cruzado con la pauta de Meta. Qué hizo en el sitio el tráfico que compró cada campaña.</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.realtimeUsers != null && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground bg-card border border-border rounded-lg px-2.5 h-9" title="Usuarios activos en los últimos 30 minutos">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" /><span className="relative inline-flex rounded-full h-2 w-2 bg-success" /></span>
              <strong className="tabular-nums">{num(data.realtimeUsers)}</strong> <span className="text-muted-foreground">ahora</span>
            </span>
          )}
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range, true)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
            <RefreshCw size={14} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!puede('costos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Tu perfil no tiene acceso a Analytics.</div>
      ) : data && data.connected === false ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-[14px] font-semibold text-foreground">Google Analytics no conectado</p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-lg mx-auto">
            Hace falta un service account de Google Cloud con rol Lector en la propiedad HYPESTYLE. En Vercel:
            <code className="bg-muted px-1 rounded mx-1">GA4_PROPERTY_ID</code> (el ID numérico de la propiedad) y
            <code className="bg-muted px-1 rounded mx-1">GA4_SERVICE_ACCOUNT_JSON</code> (el .json de la credencial). Ver <Link href="/admin/integraciones" className="underline">Integraciones</Link>.
          </p>
        </div>
      ) : state === 'error' ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-[13px] text-destructive">No pudimos consultar Google Analytics. Reintentá.</p>
          {data?.detail && <p className="text-[11px] text-muted-foreground mt-1">{data.detail}</p>}
        </div>
      ) : !rep || !t || !f ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[88px] bg-muted/40 rounded-lg animate-pulse" />)}</div>
      ) : (
        <>
          {/* Tráfico */}
          <SectionTitle right={<span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">Fuente GA4</span>}>Sitio</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Sesiones" value={num(t.sessions)} emphasis spark={rep.daily.map((d) => d.sessions)} sub={`${num(t.pageViews)} páginas vistas`} info="Visitas al sitio en el período. Una persona puede tener varias sesiones." />
            <KpiCard label="Usuarios activos" value={num(t.activeUsers)} spark={rep.daily.map((d) => d.activeUsers)} sub={`${num(t.newUsers)} nuevos`} info="Personas distintas que interactuaron con el sitio. Nuevos = primera visita en el período." />
            <KpiCard label="Tasa de interacción" value={pct(t.engagementRate)} sub={`${secs(t.avgSessionSeconds)} promedio por sesión`} info="Sesiones que duraron más de 10 s, tuvieron una conversión o vieron 2+ páginas, sobre el total. Bajo = rebote." />
            <KpiCard label="Ahora en el sitio" value={data?.realtimeUsers == null ? '—' : num(data.realtimeUsers)} sub="últimos 30 minutos" info="Usuarios activos en tiempo real según GA4. No se cachea." />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <KpiCard label="Compras (GA)" value={num(t.purchases)} estimated sub={`${fmtARS(t.purchaseRevenue)} revenue GA`} info="Evento purchase de GA4. SUB-REPORTA: sólo dispara con pago aprobado y se pierde en la vuelta desde MercadoPago y por el consentimiento de cookies. Sirve para comparar canales, no como revenue. El revenue real es Woo." />
            <KpiCard label="Conversión de sesión" value={pct(sessionConv, 2)} sub="compras GA / sesiones" info="Sobre la misma base sub-reportada de GA. Comparar entre períodos y canales, no contra Woo." />
            <KpiCard label="Agregaron al carrito" value={num(f.addToCart)} sub={cartRate == null ? undefined : `${pct(cartRate)} de las sesiones`} info="Evento add_to_cart. Se dispara desde las cards del listado y la ficha de producto." />
            <KpiCard label="Iniciaron checkout" value={num(f.beginCheckout)} sub={f.addToCart > 0 ? `${pct(f.beginCheckout / f.addToCart, 0)} de los carritos` : undefined} info="Evento begin_checkout." />
          </div>

          {/* Serie + embudo */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-3">
            <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold text-foreground">Por día</p>
                <div className="flex gap-1">
                  {CHART_METRICS.map((m) => (
                    <button key={m.key} onClick={() => setMetric(m.key)} className={`text-[11px] rounded-md px-2 py-1 transition-colors ${metric === m.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>{m.label}</button>
                  ))}
                </div>
              </div>
              <div className="h-[220px]"><TrafficChart data={rep.daily} metric={metric} loading={state === 'loading'} /></div>
            </div>
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
              <p className="text-[12px] font-semibold text-foreground mb-3">Embudo de e-commerce</p>
              <div className="space-y-2.5">
                <FunnelBar label="Vieron producto" count={f.viewItem} max={f.viewItem} />
                <FunnelBar label="Al carrito" count={f.addToCart} max={f.viewItem} rate={f.viewItem > 0 ? f.addToCart / f.viewItem : null} />
                <FunnelBar label="Checkout" count={f.beginCheckout} max={f.viewItem} rate={f.addToCart > 0 ? f.beginCheckout / f.addToCart : null} />
                <FunnelBar label="Compra (GA)" count={f.purchase} max={f.viewItem} rate={f.beginCheckout > 0 ? f.purchase / f.beginCheckout : null} />
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-3">Eventos de GA4 en el período. El porcentaje es sobre el paso anterior. La compra de GA está sub-reportada; el paso checkout → compra real se mira en Pedidos.</p>
            </div>
          </div>

          {/* Pauta × GA */}
          <SectionTitle right={<Link href="/admin/ads" className="text-[12px] text-muted-foreground hover:text-foreground">Ver Meta Ads →</Link>}>Pauta × tráfico</SectionTitle>
          {data?.metaConnected === false ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-[13px] text-muted-foreground">Meta no conectado: sin spend por campaña para cruzar. El tráfico por etiqueta está abajo en “Otros orígenes”.</div>
          ) : (
            <>
              <DataTable columns={pautaCols} rows={pauta?.matched || []} keyOf={(r) => r.campaignId || r.name} emptyTitle="Sin campañas con gasto en el período" />
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                Spend, clicks, compras Meta y ROAS son de Meta (atribución de plataforma). Sesiones, interacción, carritos y compras GA son lo que GA4 vio de ese tráfico vía <code className="bg-muted px-1 rounded">utm_campaign</code>.
                Una campaña marcada <span className="text-warning">sin utm en GA</span> tiene ads sin parámetros en la URL: su tráfico cae en “Otros orígenes” o en (not set).
              </p>
            </>
          )}

          {/* Canales */}
          <SectionTitle>Canales</SectionTitle>
          <DataTable columns={channelCols} rows={rep.channels} keyOf={(r) => r.channel} emptyTitle="Sin tráfico en el período" />

          {/* Otros orígenes */}
          {pauta && pauta.unmatched.length > 0 && (
            <>
              <SectionTitle>Otros orígenes</SectionTitle>
              <DataTable columns={otherCols} rows={pauta.unmatched.slice(0, 25)} keyOf={(r) => `${r.campaign}|${r.sourceMedium}`} />
              <p className="text-[11px] text-muted-foreground/70 mt-2">Etiquetas de GA que no corresponden a ninguna campaña de Meta del período: orgánico, referidos, mails, campañas viejas o utm mal escritos.</p>
            </>
          )}

          {/* Landings + dispositivos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-8">
            <div className="lg:col-span-2">
              <SectionTitle>Páginas de entrada</SectionTitle>
              <DataTable columns={landingCols} rows={rep.landing} keyOf={(r) => r.page} emptyTitle="Sin datos" />
            </div>
            <div>
              <SectionTitle>Dispositivos</SectionTitle>
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                {rep.devices.map((d) => {
                  const share = t.sessions > 0 ? d.sessions / t.sessions : 0;
                  return (
                    <div key={d.device}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-foreground capitalize">{d.device}</span>
                        <span className="tabular-nums text-muted-foreground">{num(d.sessions)} · {pct(share, 0)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-foreground rounded-full" style={{ width: `${share * 100}%` }} /></div>
                    </div>
                  );
                })}
                {!rep.devices.length && <p className="text-[12px] text-muted-foreground">Sin datos</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
