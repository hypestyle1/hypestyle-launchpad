'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type ScrollFadeListProps = {
  children: ReactNode;
  /** Clases del contenedor externo (borde, fondo, radio). */
  className?: string;
  /** Clases del área que scrollea. Acá va la altura. */
  scrollClassName?: string;
  /** Alto máximo del degradado, en px. */
  maxFadeHeight?: number;
};

/**
 * Contenedor con scroll que difumina el contenido contra los bordes en vez de
 * cortarlo en seco. El degradado de arriba sólo aparece cuando hay algo scrolleado
 * hacia arriba, y el de abajo desaparece al llegar al final: sirve de indicador
 * de que la lista sigue, sin agregar sombras ni flechas.
 *
 * El fondo del degradado se toma de `--scroll-fade-bg`, así que el contenedor
 * tiene que declararlo con el mismo color que su fondo real. Por defecto usa el
 * token `--background`, que es lo correcto tanto en el sitio como dentro de
 * `.admin-theme` (incluido su modo oscuro).
 */
export function ScrollFadeList({
  children,
  className,
  scrollClassName = 'max-h-80 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]',
  maxFadeHeight = 76,
}: ScrollFadeListProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const scroller = scrollRef.current;
    if (!frame || !scroller) return;

    let raf = 0;

    const update = () => {
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const fromTop = scroller.scrollTop;
      const fromBottom = max - scroller.scrollTop;

      frame.style.setProperty(
        '--top-fade-height',
        `${Math.min(maxFadeHeight, Math.max(0, fromTop))}px`,
      );
      frame.style.setProperty(
        '--bottom-fade-height',
        `${Math.min(maxFadeHeight, Math.max(0, fromBottom))}px`,
      );
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener('scroll', schedule, { passive: true });

    // Se observa también al hijo: si la lista crece o se filtra, el degradado de
    // abajo tiene que recalcularse aunque nadie haya scrolleado.
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);

    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      observer.disconnect();
    };
  }, [maxFadeHeight]);

  return (
    <div
      ref={frameRef}
      className={cn(
        'relative [--bottom-fade-height:0px] [--scroll-fade-bg:hsl(var(--background))] [--top-fade-height:0px]',
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[var(--top-fade-height)] before:bg-gradient-to-b before:from-[var(--scroll-fade-bg)] before:to-transparent before:content-['']",
        "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-[var(--bottom-fade-height)] after:bg-gradient-to-b after:from-transparent after:to-[var(--scroll-fade-bg)] after:content-['']",
        className,
      )}
    >
      <div ref={scrollRef} className={scrollClassName}>
        {children}
      </div>
    </div>
  );
}
