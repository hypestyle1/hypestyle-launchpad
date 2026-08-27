'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Info, ArrowUpRight, ArrowDownRight, Plug } from 'lucide-react';
import type { Delta } from '@/lib/dashboard/finance';
import { Sparkline } from '@/components/admin/Sparkline';

// Piezas del Control Center. Todas en tokens (light/dark). El KPI card sabe
// mostrar comparación con contexto (no flechas de color a ciegas) y un tooltip
// que explica la fórmula y qué datos faltan — transparencia, sin falsa precisión.

export function InfoTip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Más información"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <Info size={12.5} />
      </button>
      {open && (
        <span className="absolute z-40 left-1/2 -translate-x-1/2 top-5 w-60 rounded-md border border-border bg-card p-3 text-[11.5px] leading-relaxed text-muted-foreground shadow-lg font-normal normal-case tracking-normal text-left">
          {children}
        </span>
      )}
    </span>
  );
}

// Delta discreto: pill sutil, no verde/rojo saturado. Positivo = suave verde,
// negativo = suave rojo, cero = neutro. La flecha es chica.
export function DeltaBadge({ delta, positiveIsGood = true }: { delta?: Delta | null; positiveIsGood?: boolean }) {
  if (!delta || delta.pct === null) return null;
  if (delta.pct === 0) return <span className="text-[11px] text-muted-foreground/60 tabular-nums">0,0%</span>;
  const up = delta.pct > 0;
  const good = up === positiveIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums leading-none ${good ? 'text-success' : 'text-destructive'}`}>
      <Icon size={11} strokeWidth={2.5} />
      {Math.abs(delta.pct * 100).toFixed(1).replace('.', ',')}%
    </span>
  );
}

// FinanceMetricCard V2 — compacta, valor dominante, comparación discreta arriba
// a la derecha (patrón Triple Whale) y una línea secundaria opcional. Poco ruido,
// whitespace controlado. Usada por Inicio y Finanzas.
export function KpiCard({
  label, value, sub, delta, positiveIsGood = true, info, estimated, compare, emphasis, spark, sparkTone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: Delta | null;
  positiveIsGood?: boolean;
  info?: ReactNode;
  estimated?: boolean;
  compare?: ReactNode;   // ej. "vs $11,4M período ant."
  emphasis?: boolean;    // realce para la métrica protagonista
  spark?: number[];      // serie temporal real (sparkline)
  sparkTone?: 'default' | 'positive' | 'negative';
}) {
  const hasSpark = Array.isArray(spark) && spark.length >= 2;
  return (
    <div className={`bg-card border rounded-lg p-4 flex flex-col ${emphasis ? 'border-border-mid' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80 leading-none truncate">{label}</p>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
        <DeltaBadge delta={delta} positiveIsGood={positiveIsGood} />
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <p className={`font-bold text-foreground leading-none tabular-nums tracking-tight ${emphasis ? 'text-[27px]' : 'text-[22px]'}`}>{value}</p>
        {hasSpark && <div className="shrink-0 -mb-0.5"><Sparkline data={spark!} tone={sparkTone} /></div>}
      </div>
      {(sub || compare || estimated) && (
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 min-h-[15px]">
          {compare && <span className="text-[11px] text-muted-foreground/70 tabular-nums">{compare}</span>}
          {sub && <span className="text-[11px] text-muted-foreground/70">{sub}</span>}
          {estimated && <span className="text-[9.5px] uppercase tracking-wide text-warning bg-warning-soft rounded-full px-1.5 py-0.5 leading-none">Estimado</span>}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-8 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{children}</h2>
      {right}
    </div>
  );
}

// Franja compacta mientras Meta esté desconectado: no roba espacio al negocio.
// Cuando Meta se conecte (P1), el bloque de Ads se expande en su lugar.
export function AdsStrip() {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Plug size={16} className="text-muted-foreground/60 shrink-0" />
      <span className="text-[13px] font-semibold text-foreground">Meta Ads</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5">No conectado</span>
      <span className="text-[12px] text-muted-foreground flex-1 min-w-[180px]">
        Conectá Meta para ver Spend, MER, ROAS, CPA y CAC.
      </span>
      <button
        disabled
        title="Disponible en la próxima etapa (P1)"
        className="h-8 px-3.5 rounded-full border border-border text-[12px] font-semibold text-muted-foreground/70 cursor-not-allowed shrink-0"
      >
        Configurar Meta
      </button>
    </div>
  );
}

export interface AttentionItem {
  key: string;
  label: string;
  sub?: string;
  value: number | null;
  href: string | null;
  tone: 'neutral' | 'warning' | 'critical' | 'success';
}

export function AttentionRow({ item }: { item: AttentionItem }) {
  const dot = {
    neutral: 'bg-muted-foreground/40',
    warning: 'bg-warning',
    critical: 'bg-destructive',
    success: 'bg-success',
  }[item.tone];

  const clickable = !!item.href && item.value !== null && item.value > 0;

  const body = (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-card border border-border rounded-lg hover:border-border-mid transition-colors">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-[19px] font-bold text-foreground tabular-nums w-12 shrink-0">
        {item.value === null ? '—' : item.value}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-muted-foreground leading-tight">{item.label}</span>
        {item.sub && <span className="block text-[11px] text-muted-foreground/60 leading-tight">{item.sub}</span>}
      </span>
      {clickable && <ArrowUpRight size={15} className="text-muted-foreground/50 shrink-0" />}
    </div>
  );

  if (clickable) return <Link href={item.href!} className="block">{body}</Link>;
  return <div className="opacity-70">{body}</div>;
}

// ── Top products ──
export interface ProductRank {
  productId: number; name: string; units: number; revenue: number;
  cogs: number | null; contribution: number | null;
}

export function TopProducts({ rows, fmt }: { rows: ProductRank[]; fmt: (n: number) => string }) {
  if (!rows.length) {
    return <div className="bg-card border border-border rounded-lg p-6 text-center text-[13px] text-muted-foreground">Sin ventas en el período</div>;
  }
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <th className="text-left font-medium px-3 py-2">Producto</th>
              <th className="text-right font-medium px-3 py-2">Unid.</th>
              <th className="text-right font-medium px-3 py-2">Revenue</th>
              <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Contribución</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground truncate max-w-[220px]">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.units}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmt(r.revenue)}</td>
                <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">
                  {r.contribution === null
                    ? <span className="text-muted-foreground/50" title="Falta el costo de este producto">—</span>
                    : fmt(r.contribution)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Clientes nuevos vs recurrentes ──
export interface CustomerSplitData {
  newCount: number; recurringCount: number; recurringPct: number;
  revenueNew: number; revenueRecurring: number;
}

export function CustomerSplit({ data, fmt }: { data: CustomerSplitData; fmt: (n: number) => string }) {
  const total = data.newCount + data.recurringCount;
  const recPct = Math.round(data.recurringPct * 100);
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Clientes</p>
        <p className="text-[12px] text-muted-foreground tabular-nums">{recPct}% recurrentes</p>
      </div>
      {/* barra */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex mb-3">
        <div className="h-full bg-foreground" style={{ width: total ? `${(data.recurringCount / total) * 100}%` : '0%' }} />
        <div className="h-full bg-muted-foreground/30" style={{ width: total ? `${(data.newCount / total) * 100}%` : '0%' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[12px] text-muted-foreground">Recurrentes</p>
          <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{data.recurringCount}</p>
          <p className="text-[11px] text-muted-foreground/70 tabular-nums">{fmt(data.revenueRecurring)}</p>
        </div>
        <div>
          <p className="text-[12px] text-muted-foreground">Nuevos</p>
          <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{data.newCount}</p>
          <p className="text-[11px] text-muted-foreground/70 tabular-nums">{fmt(data.revenueNew)}</p>
        </div>
      </div>
    </div>
  );
}
