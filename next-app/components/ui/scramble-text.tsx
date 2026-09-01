'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ScrambleTextProps = {
  children: string;
  className?: string;
  /** Milisegundos entre pasos. En 0 o menos se muestra el texto directo. */
  intervalMs?: number;
  /** Con `false`, el primer render muestra el texto tal cual y sólo se anima
   *  cuando `children` cambia. Es lo que quiere un total: nunca aparecer
   *  cifrado al cargar la página. */
  animateOnMount?: boolean;
};

const CHARS = '-_~`!@#$%^&*()+=[]{}|;:,.<>?';
const MAX_PASOS = 48;

/** Grafemas, no code units: sin esto un emoji o una tilde compuesta se parte al
 *  medio y quedan caracteres rotos en pantalla. */
function segmentar(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

function charAlAzar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/** Versión determinística, para el primer render. Si el servidor y el cliente
 *  sortearan distinto, React tiraría error de hidratación. */
function charEstable(segmento: string, index: number) {
  let hash = index + 1;
  for (const c of segmento) {
    hash = (hash * 31 + (c.codePointAt(0) ?? 0)) % 2147483647;
  }
  return CHARS[hash % CHARS.length];
}

function mezclar(segmentos: string[], revelados: number, estable = false) {
  return segmentos
    .map((c, i) => {
      // Los espacios se dejan intactos: si se mezclan, la palabra pierde forma
      // y el texto salta de ancho en cada paso.
      if (c.trim() === '' || i < revelados) return c;
      return estable ? charEstable(c, i) : charAlAzar();
    })
    .join('');
}

/**
 * Revela un texto pasando de caracteres cifrados al contenido real.
 *
 * Se remonta con `key` cuando el texto cambia, o se usa directo para el primer
 * ingreso. Pensado para momentos puntuales —un precio que cambia, un contador de
 * drop—: usado en todos lados se gasta rápido.
 *
 * El texto real siempre está en el DOM para lectores de pantalla; lo que se
 * mezcla es una capa `aria-hidden`.
 */
export function ScrambleText({
  children,
  className,
  intervalMs = 32,
  animateOnMount = true,
}: ScrambleTextProps) {
  const [texto, setTexto] = useState(() =>
    animateOnMount ? mezclar(segmentar(children), 0, true) : children,
  );
  const primerRender = useRef(true);

  useEffect(() => {
    const segmentos = segmentar(children);
    const esMontaje = primerRender.current;
    primerRender.current = false;

    if (
      segmentos.length === 0 ||
      intervalMs <= 0 ||
      (esMontaje && !animateOnMount) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTexto(children);
      return;
    }

    let revelados = 0;
    // En textos largos se revela de a varios para que nunca pase de 48 pasos.
    const paso = Math.max(1, Math.ceil(segmentos.length / MAX_PASOS));
    setTexto(mezclar(segmentos, revelados));

    const timer = window.setInterval(() => {
      revelados = Math.min(segmentos.length, revelados + paso);
      setTexto(mezclar(segmentos, revelados));
      if (revelados >= segmentos.length) window.clearInterval(timer);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [children, intervalMs]);

  return (
    <span className={cn('inline-block', className)}>
      <span aria-hidden="true">{texto}</span>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {children}
      </span>
    </span>
  );
}
