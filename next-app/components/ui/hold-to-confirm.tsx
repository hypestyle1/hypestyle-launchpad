'use client';

import { Check } from 'lucide-react';
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

export type ConfirmInput = 'keyboard' | 'pointer';

type HoldToConfirmProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick'
> & {
  children?: ReactNode;
  confirmedContent?: ReactNode;
  /** Cuánto hay que sostener, en ms. */
  duration?: number;
  onConfirm: (input: ConfirmInput) => void;
  /** Cuánto queda en "confirmado" antes de volver a idle. 0 lo deja fijo. */
  resetAfter?: number;
};

type Estado = 'confirmed' | 'holding' | 'idle';

function prefiereMenosMovimiento() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Botón que se confirma sosteniéndolo, no con un click.
 *
 * Va en las acciones que no tienen vuelta atrás (cancelar un pedido, borrar,
 * aplicar precios en masa). Frente a un diálogo de confirmación tiene dos
 * ventajas: no interrumpe con un modal, y el gesto es lo bastante deliberado
 * como para que no salga por accidente. Combinado con `UndoNotice` cubre el
 * error antes de que llegue al cliente.
 *
 * El relleno es una transición de `clip-path`, no un timer pintando frames: si
 * la pestaña se va a segundo plano el visual y el timer no se desincronizan.
 * Con teclado se salta la animación (el `keydown` repite y quedaría raro) pero
 * el tiempo de sostenido es el mismo.
 */
export function HoldToConfirm({
  children = 'Mantené para confirmar',
  className,
  confirmedContent,
  disabled,
  duration = 1600,
  onConfirm,
  resetAfter = 1800,
  ...buttonProps
}: HoldToConfirmProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const inputRef = useRef<ConfirmInput>('pointer');
  const holding = useRef(false);
  const [input, setInput] = useState<ConfirmInput | null>(null);
  const [estado, setEstado] = useState<Estado>('idle');

  const clearConfirm = useCallback(() => {
    if (confirmTimer.current === null) return;
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = null;
  }, []);

  const completar = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    pointerId.current = null;
    clearConfirm();
    setEstado('confirmed');
    onConfirm(inputRef.current);

    if (resetAfter > 0) {
      resetTimer.current = window.setTimeout(() => {
        setEstado('idle');
        resetTimer.current = null;
      }, resetAfter);
    }
  }, [clearConfirm, onConfirm, resetAfter]);

  const cancelar = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    pointerId.current = null;
    clearConfirm();
    setEstado('idle');
  }, [clearConfirm]);

  const arrancar = useCallback(
    (modo: ConfirmInput) => {
      if (disabled || estado === 'confirmed' || holding.current) return;

      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
        resetTimer.current = null;
      }

      inputRef.current = modo;
      setInput(modo);
      holding.current = true;
      setEstado('holding');
      confirmTimer.current = window.setTimeout(completar, duration);
    },
    [completar, disabled, duration, estado],
  );

  useEffect(
    () => () => {
      clearConfirm();
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [clearConfirm],
  );

  useEffect(() => {
    if (disabled) cancelar();
  }, [cancelar, disabled]);

  function soltarCaptura(id: number) {
    const button = buttonRef.current;
    if (button?.hasPointerCapture(id)) button.releasePointerCapture(id);
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || disabled) return;
    pointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    arrancar('pointer');
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!holding.current || pointerId.current !== event.pointerId) return;

    // Arrastrar el dedo o el mouse fuera del botón cancela: es la salida
    // natural cuando alguien se arrepiente a mitad del gesto.
    const rect = event.currentTarget.getBoundingClientRect();
    const margen = 8;
    const afuera =
      event.clientX < rect.left - margen ||
      event.clientX > rect.right + margen ||
      event.clientY < rect.top - margen ||
      event.clientY > rect.bottom + margen;

    if (afuera) {
      cancelar();
      soltarCaptura(event.pointerId);
    }
  }

  function onPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    if (pointerId.current !== event.pointerId) return;
    cancelar();
    soltarCaptura(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    arrancar('keyboard');
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    cancelar();
  }

  const confirmado = estado === 'confirmed';
  const sosteniendo = estado === 'holding';

  const relleno = {
    clipPath: sosteniendo ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
    transitionProperty: 'clip-path',
    transitionDuration:
      prefiereMenosMovimiento() || input === 'keyboard'
        ? '0ms'
        : sosteniendo
          ? `${duration}ms`
          : '180ms',
    transitionTimingFunction: sosteniendo ? 'linear' : 'cubic-bezier(0.23, 1, 0.32, 1)',
  };

  return (
    <button
      {...buttonProps}
      ref={buttonRef}
      type="button"
      aria-busy={sosteniendo}
      data-input={input}
      disabled={disabled}
      onBlur={cancelar}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onLostPointerCapture={cancelar}
      onPointerCancel={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      className={cn(
        'relative isolate inline-flex h-9 min-w-40 touch-none select-none items-center justify-center overflow-hidden',
        'rounded-md border border-destructive/60 bg-destructive/10 px-3 text-sm font-medium text-destructive',
        'outline-none transition-[transform,border-color,background-color,color] duration-150',
        'focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-[input=pointer]:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        confirmado && 'bg-destructive text-destructive-foreground',
        className,
      )}
    >
      {confirmado ? (
        <span className="relative flex items-center justify-center gap-1.5">
          {confirmedContent ?? (
            <>
              <Check aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={2.5} />
              Confirmado
            </>
          )}
        </span>
      ) : (
        <>
          <span className="relative flex items-center justify-center gap-1.5">{children}</span>
          {/* Copia del label sobre el relleno: al avanzar el clip, el texto se
              "rellena" junto con el fondo en vez de tener que cambiar de color. */}
          <span
            aria-hidden="true"
            style={relleno}
            className="absolute inset-0 flex items-center justify-center gap-1.5 bg-destructive px-3 text-destructive-foreground"
          >
            {children}
          </span>
        </>
      )}
    </button>
  );
}
