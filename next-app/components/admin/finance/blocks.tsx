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
              const isTotal = r.kind === 'subtotal' || r.kind === 'result';
              const sign = r.kind === 'subtract' && r.amount ? '−' : '';
              const val = r.amount === null
                ? <span className="text-warning">Pendiente</span>
                : <span className="tabular-nums">{sign}{fmtARS(Math.abs(r.amount))}</span>;
              return (
                <tr key={i} className={`border-b border-border last:border-0 ${isTotal ? 'bg-muted/40' : ''} ${r.kind === 'result' ? 'border-t-2 border-t-foreground/20' : ''}`}>
                  <td className={`px-4 py-2.5 ${isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${r.kind === 'subtract' ? 'pl-8' : ''}`}>
                    {r.label}
                    {r.hint && <span className="block text-[11px] text-muted-foreground/60 font-normal">{r.hint}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center w-24">
                    {r.source && <SourceBadge source={r.source} />}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${isTotal ? 'font-bold text-foreground text-[15px]' : r.kind === 'subtract' ? 'text-destructive' : 'text-foreground'}`}>
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
              <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.orders}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmtARS(r.grossCollected)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-destructive">{r.economicCost ? `−${fmtARS(r.economicCost)}` : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.effectiveFeeRate)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmtARS(r.netCollected)}</td>
                <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">
                  <span className={r.coverage >= 1 ? 'text-success' : r.coverage >= 0.5 ? 'text-muted-foreground' : 'text-warning'}>{pct(r.coverage)}</span>
                </td>
              </tr>
            ))}
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

export function FinanceSectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-8 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{children}</h2>
      {right}
    </div>
  );
}
