'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepperStep<T extends string> = { id: T; label: string };

type StepperProps<T extends string> = {
  steps: StepperStep<T>[];
  current: T;
  /** Se llama sólo para pasos ya completados: volver atrás siempre es seguro,
   *  saltar adelante no (el paso actual valida al enviar). */
  onSelect?: (id: T) => void;
  className?: string;
};

/**
 * Indicador de pasos del checkout. Los completados quedan marcados y son
 * clickeables para volver; el actual va relleno; los que faltan, vacíos. La
 * línea entre pasos se pinta hasta el actual.
 */
export function Stepper<T extends string>({ steps, current, onSelect, className }: StepperProps<T>) {
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <ol className={cn('flex items-center justify-center', className)} aria-label="Pasos del checkout">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const clickable = done && !!onSelect;

        return (
          <li key={s.id} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-2 h-px w-8 transition-colors duration-300 sm:w-12',
                  i <= idx ? 'bg-foreground' : 'bg-border',
                )}
              />
            )}
            <button
              type="button"
              onClick={clickable ? () => onSelect(s.id) : undefined}
              disabled={!clickable}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'group flex items-center gap-2 text-[12px] disabled:cursor-default',
                clickable && 'cursor-pointer',
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full border text-[10px] font-bold transition-colors duration-300',
                  active && 'border-foreground bg-foreground text-background',
                  done && 'border-foreground bg-foreground text-background group-hover:bg-foreground/80',
                  !active && !done && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'transition-colors duration-300',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  clickable && 'group-hover:text-foreground group-hover:underline group-hover:underline-offset-2',
                )}
              >
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
