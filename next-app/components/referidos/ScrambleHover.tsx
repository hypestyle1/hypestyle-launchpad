'use client';

import { useRef, useState } from 'react';
import { ScrambleText } from '@/components/ui/scramble-text';
import { cn } from '@/lib/utils';

type Props = {
  children: string;
  className?: string;
  intervalMs?: number;
};

/**
 * Scramble al hover, sobre el ScrambleText existente: se remonta con `key` en
 * cada mouseenter. Solo con puntero fino (en touch no hay hover) y con un
 * cooldown de 900 ms para que no se vuelva un tic. ScrambleText ya respeta
 * `prefers-reduced-motion` por su cuenta.
 */
export function ScrambleHover({ children, className, intervalMs = 22 }: Props) {
  const [pasada, setPasada] = useState(0);
  const libreDesde = useRef(0);

  const onEnter = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const ahora = Date.now();
    if (ahora < libreDesde.current) return;
    libreDesde.current = ahora + 900;
    setPasada(p => p + 1);
  };

  return (
    <span className={cn('inline-block', className)} onMouseEnter={onEnter}>
      {/* La primera pasada (pasada=0) entra sin animar: el scramble es del hover. */}
      <ScrambleText key={pasada} animateOnMount={pasada > 0} intervalMs={intervalMs}>
        {children}
      </ScrambleText>
    </span>
  );
}
