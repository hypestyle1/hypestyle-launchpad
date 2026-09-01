'use client';

import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type UndoInput = 'keyboard' | 'pointer';

type UndoNoticeProps = {
  className?: string;
  /** Ventana para deshacer, en ms. */
  duration?: number;
  message?: string;
  /** Se llama cuando se agota la ventana: acá recién se hace efectiva la acción. */
  onExpire: () => void;
  onUndo: (input: UndoInput) => void;
};

function prefiereMenosMovimiento() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Aviso con ventana para deshacer. El botón "Deshacer" se vacía a medida que se
 * agota el tiempo, así la cuenta regresiva se ve sin necesidad de un número.
 *
 * El patrón que habilita: la acción se aplica recién en `onExpire`, no al
 * apretar. Eso convierte un "¿estás seguro?" en algo reversible de verdad y
 * evita el pedido roto que después hay que resolverle al cliente a mano.
 *
 * Va bien dentro de un toast de sonner o suelto arriba de una tabla.
 */
export function UndoNotice({
  className,
  duration = 5000,
  message = 'Listo',
  onExpire,
  onUndo,
}: UndoNoticeProps) {
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    // Un frame de delay: si el clip arranca en el mismo tick en que se monta,
    // el navegador no tiene estado previo y la transición no corre.
    const frame = window.requestAnimationFrame(() => setCorriendo(true));
    const timer = window.setTimeout(onExpire, duration);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [duration, onExpire]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-9 items-center justify-between gap-3 rounded-md border border-border bg-card p-1 pl-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
        <p className="truncate text-xs font-medium text-foreground">{message}</p>
      </div>

      <button
        type="button"
        onClick={(event) => onUndo(event.detail === 0 ? 'keyboard' : 'pointer')}
        className="relative isolate flex h-7 min-w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
      >
        <span className="flex items-center gap-1.5">
          <RotateCcw aria-hidden="true" className="h-[13px] w-[13px]" strokeWidth={2.5} />
          Deshacer
        </span>
        {/* Capa llena que se vacía de izquierda a derecha: es el reloj. */}
        <span
          aria-hidden="true"
          style={{
            clipPath: corriendo ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)',
            transitionProperty: 'clip-path',
            transitionDuration: prefiereMenosMovimiento() ? '0ms' : `${duration}ms`,
            transitionTimingFunction: 'linear',
          }}
          className="absolute inset-0 flex items-center justify-center gap-1.5 bg-foreground px-2.5 text-background"
        >
          <RotateCcw aria-hidden="true" className="h-[13px] w-[13px]" strokeWidth={2.5} />
          Deshacer
        </span>
      </button>
    </div>
  );
}
