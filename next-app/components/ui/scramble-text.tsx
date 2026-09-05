'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { mezclar, segmentar } from '@/lib/scramble';

type ScrambleTextProps = {
  children: string;
  className?: string;
  /** Milisegundos entre pasos. En 0 o menos se muestra el texto directo. */
  intervalMs?: number;
  /** Con `false`, el primer render muestra el texto tal cual y sólo se anima
   *  cuando `children` cambia. Es lo que quiere un total: nunca aparecer
   *  cifrado al cargar la página. */
  animateOnMount?: boolean;
  /** Para montos: solo se mezclan los dígitos, y con dígitos. El símbolo de
   *  moneda, los puntos de miles y la coma quedan en su lugar, así el total
   *  se ve como un número que rueda y no como "$ >!;]%,]" por un instante. */
  numeric?: boolean;
};

const MAX_PASOS = 48;

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
  numeric = false,
}: ScrambleTextProps) {
  const [texto, setTexto] = useState(() =>
    animateOnMount ? mezclar(segmentar(children), 0, true, numeric) : children,
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
    setTexto(mezclar(segmentos, revelados, false, numeric));

    const timer = window.setInterval(() => {
      revelados = Math.min(segmentos.length, revelados + paso);
      setTexto(mezclar(segmentos, revelados, false, numeric));
      if (revelados >= segmentos.length) window.clearInterval(timer);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [children, intervalMs, numeric]);

  return (
    <span className={cn('inline-block', className)}>
      <span aria-hidden="true">{texto}</span>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {children}
      </span>
    </span>
  );
}
