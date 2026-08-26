'use client';

import { ReactNode } from 'react';
import { TableSkeleton, EmptyState } from './ui';

// Tabla compartida del panel. Reemplaza las tres técnicas ad-hoc que había
// (table responsive, grid a mano, cards). Densa pero legible, con scroll propio
// para no romper el ancho de la página, header sticky, y estados de carga/vacío.

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Ancho fijo opcional (ej. '120px'). */
  width?: string;
  /** Ocultar en mobile. */
  hideOnMobile?: boolean;
  /** Callback de orden si la columna es ordenable. */
  onSort?: () => void;
  sortDir?: 'asc' | 'desc' | null;
}

export function DataTable<T>({
  columns, rows, keyOf, onRowClick, loading, emptyTitle = 'Nada por acá', emptyHint,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (loading) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <TableSkeleton rows={6} />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="border border-border rounded-lg bg-card">
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </div>
    );
  }

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-3 py-2.5 font-medium text-[11px] uppercase tracking-wide text-muted-foreground/80 whitespace-nowrap ${alignCls(c.align)} ${c.hideOnMobile ? 'hidden md:table-cell' : ''} ${c.onSort ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                  onClick={c.onSort}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortDir && <span className="text-foreground">{c.sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyOf(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-muted/40' : ''} transition-colors`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2.5 text-foreground align-middle ${alignCls(c.align)} ${c.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                  >
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
