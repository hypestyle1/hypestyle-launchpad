'use client';

import { ReactNode } from 'react';

// Piezas de UI compartidas del panel. Reemplazan los bloques copy-paste que
// cada pantalla traía (header sticky ×9, metric cards ×4 variantes, badges de
// estado ×5 mapas, "Cargando…" ×12, window.confirm ×7). Todo en tokens: light
// y dark salen gratis.

/* ── Encabezado de página ── */

export function PageHeader({ title, subtitle, children }: {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode; // acciones a la derecha
}) {
  return (
    <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 sticky top-0 z-10">
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold text-foreground leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[12px] text-muted-foreground leading-tight mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 ml-auto">{children}</div>}
    </div>
  );
}

/* ── Métricas ── */

export function MetricCard({ label, value, hint, tone = 'default', onClick, active }: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'critical' | 'muted';
  onClick?: () => void;
  active?: boolean;
}) {
  const valueColor = {
    default:  'text-foreground',
    success:  'text-success',
    warning:  'text-warning',
    critical: 'text-destructive',
    muted:    'text-muted-foreground/50',
  }[tone];
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`bg-card border rounded-lg p-4 text-left w-full transition-colors ${
        active ? 'border-foreground' : 'border-border'
      } ${onClick ? 'hover:border-border-mid cursor-pointer' : ''}`}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 leading-tight">{label}</p>
      <p className={`text-[22px] font-bold mt-1 leading-none tabular-nums ${valueColor}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">{hint}</p>}
    </Comp>
  );
}

/* ── Badge de estado ── */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'critical' | 'info';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral:  'bg-muted text-muted-foreground',
  success:  'bg-success-soft text-success',
  warning:  'bg-warning-soft text-warning',
  critical: 'bg-destructive/10 text-destructive',
  info:     'bg-secondary text-secondary-foreground',
};

export function StatusBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Mapa canónico de estados de pedido Woo → label + tono. Antes redefinido en 5 archivos. */
export const ORDER_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  'pending':    { label: 'Sin pagar',   tone: 'warning' },
  'on-hold':    { label: 'En espera',   tone: 'warning' },
  'processing': { label: 'Pagado',      tone: 'info' },
  'enviado':    { label: 'Enviado',     tone: 'success' },
  'completed':  { label: 'Completado',  tone: 'success' },
  'cancelled':  { label: 'Cancelado',   tone: 'neutral' },
  'refunded':   { label: 'Reembolsado', tone: 'neutral' },
  'failed':     { label: 'Falló',       tone: 'critical' },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] || { label: status, tone: 'neutral' as BadgeTone };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

/* ── Estados de página ── */

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return <div className="text-center py-20 text-[13px] text-muted-foreground animate-pulse">{label}</div>;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <div className="h-3 w-14 bg-muted rounded-full" />
          <div className="h-3 flex-1 bg-muted rounded-full" />
          <div className="h-3 w-20 bg-muted rounded-full" />
          <div className="h-3 w-16 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children?: ReactNode }) {
  return (
    <div className="text-center py-20 px-4">
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      {hint && <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Algo falló', hint, onRetry }: { title?: ReactNode; hint?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="text-center py-20 px-4">
      <p className="text-[14px] font-semibold text-destructive">{title}</p>
      {hint && <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-[12px] font-semibold border border-border rounded-full px-4 py-1.5 hover:border-border-mid text-foreground">
          Reintentar
        </button>
      )}
    </div>
  );
}

/* ── Confirmación ── */

// Modal propio, sin portal a document.body: los portales de Radix se montan
// fuera de .admin-theme y resolverían los tokens del sitio público (se verían
// en claro dentro del panel oscuro).
export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'default', busy, onConfirm, onClose }: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'critical';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg p-5 w-full max-w-sm"
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[14px] font-bold text-foreground">{title}</p>
        {body && <div className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{body}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="text-[12px] font-semibold px-4 py-2 rounded-full border border-border text-foreground hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`text-[12px] font-semibold px-4 py-2 rounded-full disabled:opacity-50 ${
              tone === 'critical'
                ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
