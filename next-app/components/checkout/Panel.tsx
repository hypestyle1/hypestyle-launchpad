'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tarjeta blanca de cada sección del checkout: ícono negro redondo, título en
 * mayúsculas y una bajada opcional. Sobre el fondo gris del checkout separa
 * los bloques sin necesidad de líneas.
 */
export function Panel({
  icon: Icon,
  title,
  sub,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[10px] border border-border bg-white', className)}>
      <header className="flex items-center gap-3 px-5 pt-5 pb-4 sm:px-6">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-bg-dark text-white">
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em]">{title}</h2>
          {sub && <p className="mt-0.5 text-[12px] text-muted-foreground">{sub}</p>}
        </div>
        {action}
      </header>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}

/** Filas "Contacto / Enviar a / Envío" con su ícono y el link para cambiar. */
export function Recap({
  rows,
  cambiar,
}: {
  rows: { icon: LucideIcon; label: string; value: React.ReactNode; extra?: React.ReactNode; onChange?: () => void }[];
  cambiar: string;
}) {
  return (
    <div className="divide-y divide-border rounded-[10px] border border-border bg-white text-[13px]">
      {rows.map(({ icon: Icon, label, value, extra, onChange }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-foreground/50" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="truncate">{value}</p>
            {extra && <p className="truncate text-[11px] text-muted-foreground">{extra}</p>}
          </div>
          {onChange && (
            <button
              type="button"
              onClick={onChange}
              className="flex-shrink-0 text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {cambiar}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Opción elegible (tarifa de envío, sucursal). Radio nativo oculto, así el
 * teclado y los lectores de pantalla siguen funcionando, con un radio propio
 * cuyo punto entra animado.
 */
export function RadioCard({
  name,
  checked,
  onSelect,
  icon: Icon,
  title,
  sub,
  right,
  className,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3.5 rounded-[10px] border px-4 py-4 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/20 has-[:focus-visible]:ring-offset-1',
        checked ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40',
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
          checked ? 'border-foreground' : 'border-foreground/30',
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span
              key="dot"
              className="block h-2 w-2 rounded-full bg-foreground"
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={reduce ? undefined : { scale: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            />
          )}
        </AnimatePresence>
      </span>
      {Icon && (
        <span
          className={cn(
            'grid h-10 w-10 flex-shrink-0 place-items-center rounded-[8px] transition-colors',
            checked ? 'bg-bg-dark text-white' : 'bg-foreground/[0.05] text-foreground/70',
          )}
        >
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{title}</span>
        {sub && <span className="mt-0.5 block text-[11px] text-muted-foreground">{sub}</span>}
      </span>
      {right && <span className="flex-shrink-0 text-right tabular-nums">{right}</span>}
    </label>
  );
}

/** Barra de progreso hacia el envío gratis a sucursal. */
export function BarraEnvioGratis({ falta, progreso, children }: { falta: number; progreso: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, progreso)) * 100;
  return (
    <div className="rounded-[10px] bg-foreground/[0.04] px-4 py-3.5">
      <p className="text-[12px] text-foreground/80">{children}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
        <motion.div
          className={cn('h-full rounded-full', falta <= 0 ? 'bg-green-600' : 'bg-bg-dark')}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}
