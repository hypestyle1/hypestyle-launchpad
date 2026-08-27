'use client';

import { ReactNode } from 'react';
import { fmtARS } from '@/lib/admin-format';
import type { DataSource } from '@/lib/finance/types';

// Piezas del módulo Finanzas. Lenguaje visual del panel (mono, editorial, tokens).

const SOURCE_LABEL: Record<DataSource, string> = {
  exact: 'Exacto', snapshot: 'Exacto', configured: 'Configurado', missing: 'Faltante',
};
const SOURCE_TONE: Record<DataSource, string> = {
  exact: 'bg-success-soft text-success',
  snapshot: 'bg-success-soft text-success',
  configured: 'bg-secondary text-secondary-foreground',
  missing: 'bg-warning-soft text-warning',
};

export function SourceBadge({ source }: { source: DataSource }) {
  return (
    <span className={`inline-block text-[9.5px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${SOURCE_TONE[source]}`}>
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Waterfall: Revenue → Contribution Profit ──
export interface WaterfallRow {
  label: string;
  amount: number | null;   // null = faltante (no se muestra $0)
  kind: 'add' | 'subtract' | 'subtotal' | 'result';
  source?: DataSource;
  hint?: string;
}

export function Waterfall({ rows }: { rows: WaterfallRow[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map((r, i) => {
              const isSub = r.kind === 'subtotal';
              const isResult = r.kind === 'result';
              const isTotal = isSub || isResult;
              const sign = r.kind === 'subtract' && r.amount ? '−' : '';
              const val = r.amount === null
                ? <span className="text-warning font-normal">Pendiente</span>
                : <span className="tabular-nums">{sign}{fmtARS(Math.abs(r.amount))}</span>;
              return (
                <tr key={i} className={`border-b border-border last:border-0 ${isSub ? 'bg-muted/30' : ''} ${isResult ? 'bg-foreground text-background' : ''}`}>
                  <td className={`px-4 ${isResult ? 'py-3.5' : 'py-2.5'} ${isResult ? 'font-semibold' : isSub ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${r.kind === 'subtract' ? 'pl-8' : ''}`}>
                    <span className={isResult ? 'text-[10.5px] uppercase tracking-[0.08em] opacity-80 font-medium' : ''}>{r.label}</span>
                    {r.hint && <span className={`block text-[11px] font-normal ${isResult ? 'opacity-70' : 'text-muted-foreground/60'}`}>{r.hint}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center w-20">
                    {r.source && !isResult && <SourceBadge source={r.source} />}
                  </td>
                  <td className={`px-4 text-right tracking-tight ${isResult ? 'py-3.5 font-bold text-[19px]' : isSub ? 'py-2.5 font-bold text-foreground text-[14px]' : r.kind === 'subtract' ? 'py-2.5 text-destructive' : 'py-2.5 text-foreground'}`}>
                    {val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tabla de pasarelas ──
export interface GatewayRow {
  group: string; label: string; orders: number; grossCollected: number;
  economicCost: number; effectiveFeeRate: number; netCollected: number; coverage: number;
}

export function GatewayTable({ rows }: { rows: GatewayRow[] }) {
  if (!rows.length) return <div className="bg-card border border-border rounded-lg p-6 text-center text-[13px] text-muted-foreground">Sin cobros en el período</div>;
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground/80">
              <th className="text-left font-medium px-3 py-2">Pasarela</th>
              <th className="text-right font-medium px-3 py-2">Pedidos</th>
              <th className="text-right font-medium px-3 py-2">Bruto</th>
              <th className="text-right font-medium px-3 py-2">Costo</th>
              <th className="text-right font-medium px-3 py-2">Fee ef.</th>
              <th className="text-right font-medium px-3 py-2">Neto acred.</th>
              <th className="text-center font-medium px-3 py-2 hidden sm:table-cell">Calidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const q: DataSource = r.coverage >= 0.99 ? 'exact' : r.coverage > 0 ? 'configured' : 'missing';
              return (
              <tr key={r.group} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 text-foreground font-medium">{r.label}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.orders}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmtARS(r.grossCollected)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-destructive">{r.economicCost ? `−${fmtARS(r.economicCost)}` : '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{pct(r.effectiveFeeRate)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmtARS(r.netCollected)}</td>
                <td className="px-3 py-2.5 text-center hidden sm:table-cell"><SourceBadge source={q} /></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bloque "Datos por completar" ──
export function DataToComplete({ items }: { items: { label: string; href: string | null }[] }) {
  const real = items.filter(Boolean);
  if (!real.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      {real.map((it, i) => (
        <a key={i} href={it.href || undefined}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] ${it.href ? 'text-foreground hover:bg-muted/40' : 'text-muted-foreground'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
          {it.label}
        </a>
      ))}
    </div>
  );
}

// ── Calidad de datos: barras sutiles exact / configured / estimated / missing ──
// No finge exactitud: muestra cuánto de cada costo es dato real vs regla vs falta.
export interface QualityRow {
  label: string;
  segments: { kind: DataSource | 'estimated'; value: number }[]; // suman ~1
}

const SEG_COLOR: Record<string, string> = {
  exact: 'bg-success',
  snapshot: 'bg-success',
  configured: 'bg-foreground/45',
  estimated: 'bg-warning',
  missing: 'bg-muted-foreground/15',
};
const SEG_LABEL: Record<string, string> = {
  exact: 'exacto', snapshot: 'exacto', configured: 'configurado', estimated: 'estimado', missing: 'faltante',
};

export function DataQualityCard({ rows }: { rows: QualityRow[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="space-y-3.5">
        {rows.map((r) => {
          const main = [...r.segments].sort((a, b) => b.value - a.value)[0];
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[12px] font-medium text-foreground">{r.label}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {SEG_LABEL[main.kind]} {pct(main.value)}
                </span>
              </div>
              <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
                {r.segments.filter((s) => s.value > 0).map((s, i) => (
                  <div key={i} className={SEG_COLOR[s.kind]} style={{ width: `${Math.min(100, s.value * 100)}%` }} title={`${SEG_LABEL[s.kind]} ${pct(s.value)}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FinanceSectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-8 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{children}</h2>
      {right}
    </div>
  );
}
