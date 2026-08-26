'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { Info, ArrowUpRight, ArrowDownRight, Plug } from 'lucide-react';
import type { Delta } from '@/lib/dashboard/finance';

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

export function DeltaBadge({ delta, positiveIsGood = true }: { delta?: Delta | null; positiveIsGood?: boolean }) {
  if (!delta || delta.pct === null) return null;
  const up = delta.pct > 0;
  const good = up === positiveIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  if (delta.pct === 0) return <span className="text-[11px] text-muted-foreground/70 tabular-nums">0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] tabular-nums ${good ? 'text-success' : 'text-destructive'}`}>
      <Icon size={12} />
      {Math.abs(delta.pct * 100).toFixed(1)}%
    </span>
  );
}

export function KpiCard({
  label, value, sub, delta, positiveIsGood = true, info, estimated,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: Delta | null;
  positiveIsGood?: boolean;
  info?: ReactNode;
  estimated?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 leading-none">{label}</p>
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <p className="text-[22px] font-bold text-foreground mt-1.5 leading-none tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-1.5 min-h-[16px]">
        <DeltaBadge delta={delta} positiveIsGood={positiveIsGood} />
        {sub && <span className="text-[11px] text-muted-foreground/70">{sub}</span>}
        {estimated && <span className="text-[10px] uppercase tracking-wide text-warning bg-warning-soft rounded px-1.5 py-0.5">Estimado</span>}
      </div>
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

export function AdsNotConnected() {
  return (
    <div className="bg-card border border-dashed border-border-mid rounded-lg p-6 flex flex-col items-center text-center gap-2">
      <Plug size={18} className="text-muted-foreground/60" />
      <p className="text-[14px] font-semibold text-foreground">Meta Ads no conectado</p>
      <p className="text-[12px] text-muted-foreground max-w-sm leading-relaxed">
        Conectá Meta para ver inversión, ROAS, CPA, CAC y MER cruzados con tus ventas reales.
      </p>
      <button
        disabled
        title="Disponible en la próxima etapa (P1)"
        className="mt-1 h-8 px-4 rounded-full border border-border text-[12px] font-semibold text-muted-foreground/70 cursor-not-allowed"
      >
        Configurar Meta
      </button>
    </div>
  );
}

export interface AttentionItem {
  key: string;
  label: string;
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

  const body = (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-card border border-border rounded-lg hover:border-border-mid transition-colors">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-[19px] font-bold text-foreground tabular-nums w-12 shrink-0">
        {item.value === null ? '—' : item.value}
      </span>
      <span className="text-[13px] text-muted-foreground leading-tight flex-1">{item.label}</span>
      {item.href && item.value !== null && item.value > 0 && (
        <ArrowUpRight size={15} className="text-muted-foreground/50 shrink-0" />
      )}
    </div>
  );

  if (item.href && item.value !== null && item.value > 0) {
    return <Link href={item.href} className="block">{body}</Link>;
  }
  return <div className="opacity-70">{body}</div>;
}
