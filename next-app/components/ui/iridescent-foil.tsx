'use client';

import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/** Metal de base de la lámina. Los estilos viven en globals.css (.hs-foil-*). */
export type FoilTone = 'plata' | 'oro' | 'esmeralda' | 'negro';

type ScrollProgressMode = 'element' | 'document';

type IridescentFoilProps = ComponentPropsWithoutRef<'div'> & {
  /** Con 'document' la lámina barre según el scroll de toda la página. */
  scrollProgressMode?: ScrollProgressMode;
  tone?: FoilTone;
};

const TONE_CLASS: Record<FoilTone, string> = {
  plata: '',
  oro: 'hs-foil-oro',
  esmeralda: 'hs-foil-esmeralda',
  negro: 'hs-foil-negro',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Se recortan los decimales: escribir '43.7%' en vez de '43.70000000001%'
 *  evita invalidar el estilo con cambios que no se ven. */
const pct = (value: number) => `${Number((value * 100).toFixed(2))}%`;
const deg = (value: number) => `${Number(value.toFixed(2))}deg`;
const num = (value: number) => `${Number(value.toFixed(3))}`;

/** Progreso de 0 a 1 mientras el elemento cruza el viewport. */
function elementScrollProgress(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const range = window.innerHeight + rect.height;
  return range > 0 ? clamp((window.innerHeight - rect.top) / range, 0, 1) : 0;
}

function documentScrollProgress() {
  const el = document.scrollingElement ?? document.documentElement;
  const range = el.scrollHeight - window.innerHeight;
  return range > 0 ? clamp(el.scrollTop / range, 0, 1) : 0;
}

/**
 * Superficie con acabado de lámina holográfica: el brillo se desplaza con el
 * puntero y con el scroll.
 *
 * El componente no anima nada por JS. Sólo escribe custom properties sobre el
 * nodo y el movimiento entero lo resuelve CSS con `background-position`, así el
 * trabajo queda en el compositor. Ver el bloque `.hs-foil` en globals.css.
 *
 * OJO: las seis capas —el contenido incluido— van en posición absoluta, así que
 * la lámina no toma altura de sus hijos. El contenedor tiene que traer su propio
 * tamaño (`aspect-*`, `h-*` o similar) por className.
 *
 * Tres decisiones para que no cueste caro en mobile:
 *  - Los listeners se enganchan sólo mientras la pieza está en pantalla
 *    (IntersectionObserver). Varias láminas en una página no acumulan
 *    `pointermove` globales corriendo a la vez.
 *  - El puntero se sigue únicamente donde hay uno de verdad (`hover: hover`).
 *    En touch manda el scroll, que es lo que se percibe igual.
 *  - Con `prefers-reduced-motion` no se engancha nada y la lámina queda fija en
 *    su estado inicial, que ya se ve bien.
 */
export function IridescentFoil({
  children,
  className,
  scrollProgressMode = 'element',
  tone = 'plata',
  ...props
}: IridescentFoilProps) {
  const foilRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const foil = foilRef.current;
    if (!foil) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tracksPointer = window.matchMedia('(hover: hover)').matches;

    const apply = () => {
      frameRef.current = null;
      const { x, y } = pointerRef.current;
      const progress =
        scrollProgressMode === 'document'
          ? documentScrollProgress()
          : elementScrollProgress(foil);
      const s = foil.style;

      s.setProperty('--foil-shift', pct(progress * 0.82 + (x - 0.5) * 0.18));
      s.setProperty('--foil-y-shift', pct(progress * 0.28 + (y - 0.5) * 0.12));
      s.setProperty('--glare-x', pct(x));
      s.setProperty('--glare-y', pct(y));
      s.setProperty('--pointer-x', pct(x));
      s.setProperty('--pointer-y', pct(y));
      s.setProperty('--shine-angle', deg(105 + progress * 80 + (x - 0.5) * 28));
      s.setProperty(
        '--shine-opacity',
        num(0.56 + Math.abs(x - 0.5) * 0.24 + progress * 0.12),
      );
    };

    const schedule = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(apply);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = foil.getBoundingClientRect();
      // El rango se acota a 0.08–0.92 para que el destello no se pegue al borde.
      pointerRef.current = {
        x: rect.width > 0 ? clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92) : 0.5,
        y: rect.height > 0 ? clamp((event.clientY - rect.top) / rect.height, 0.08, 0.92) : 0.5,
      };
      schedule();
    };

    let listening = false;

    const listen = () => {
      if (listening) return;
      listening = true;
      if (tracksPointer) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
      }
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      schedule();
    };

    const unlisten = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };

    // Sin IntersectionObserver (navegador viejo) se escucha siempre: peor para
    // la batería, pero la lámina no queda congelada.
    if (typeof IntersectionObserver === 'undefined') {
      listen();
      return unlisten;
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? listen() : unlisten()),
      { rootMargin: '128px' },
    );
    observer.observe(foil);

    return () => {
      observer.disconnect();
      unlisten();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [scrollProgressMode]);

  return (
    <div {...props} ref={foilRef} className={cn('hs-foil', TONE_CLASS[tone], className)}>
      <span aria-hidden className="hs-foil-base" />
      <span aria-hidden className="hs-foil-film" />
      <span aria-hidden className="hs-foil-pearl" />
      <div className="hs-foil-content">{children}</div>
      <span aria-hidden className="hs-foil-shine" />
      <span aria-hidden className="hs-foil-glare" />
    </div>
  );
}
