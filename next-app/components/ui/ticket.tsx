'use client';

import { type CSSProperties, type PointerEvent, type ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Silueta de ticket: esquinas rectas y dos muescas semicirculares a la altura
 *  del talón, que es donde se "corta". */
const CLIP = `polygon(
  0 0,
  100% 0,
  100% calc(100% - var(--ticket-stub) - var(--ticket-notch)),
  calc(100% - var(--ticket-notch)) calc(100% - var(--ticket-stub)),
  100% calc(100% - var(--ticket-stub) + var(--ticket-notch)),
  100% 100%,
  0 100%,
  0 calc(100% - var(--ticket-stub) + var(--ticket-notch)),
  var(--ticket-notch) calc(100% - var(--ticket-stub)),
  0 calc(100% - var(--ticket-stub) - var(--ticket-notch))
)`;

const TILT_MEDIA = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

type TicketProps = {
  body: ReactNode;
  stub: ReactNode;
  className?: string;
  /** Color del papel y de la tinta. Por defecto blanco sobre negro, el par de la marca. */
  paper?: string;
  ink?: string;
  /** Alto del talón (CSS length). */
  stubHeight?: string;
  /** Inclinación con el puntero. Sólo donde hay puntero fino y sin reduced-motion. */
  tilt?: boolean;
  'aria-label'?: string;
};

/**
 * Ticket de papel con talón perforado. El cuerpo y el talón los pone quien lo
 * usa; el componente sólo da la silueta, la línea de corte y una inclinación
 * suave que sigue al puntero (máximo 6°), para que se lea como un objeto y no
 * como una tarjeta más.
 *
 * La inclinación es un `transform` que se escribe en cada `pointermove` sin
 * pasar por estado de React: seis grados de rotación no justifican un render.
 */
export function Ticket({
  body,
  stub,
  className,
  paper = '#ffffff',
  ink = '#0a0a0a',
  stubHeight = '26%',
  tilt = true,
  'aria-label': ariaLabel,
}: TicketProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [puedeInclinar] = useState(
    () => tilt && typeof window !== 'undefined' && window.matchMedia(TILT_MEDIA).matches,
  );

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !puedeInclinar) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) scale(1.015)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  const style = {
    '--ticket-stub': stubHeight,
    '--ticket-notch': '12px',
    '--ticket-paper': paper,
    '--ticket-ink': ink,
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.10)) drop-shadow(0 18px 26px rgba(0,0,0,0.14))',
  } as CSSProperties;

  return (
    <div className={cn('relative', className)} style={style}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative h-full w-full transition-transform duration-200 ease-out [transform-style:preserve-3d]"
        style={{ clipPath: CLIP }}
      >
        <article
          aria-label={ariaLabel}
          className="relative grid h-full w-full grid-rows-[minmax(0,1fr)_var(--ticket-stub)] overflow-hidden text-[var(--ticket-ink)]"
          style={{
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.10), transparent 42%), var(--ticket-paper)',
          }}
        >
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            {body}
            {/* Línea de corte entre las dos muescas. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-px left-[calc(var(--ticket-notch)+6px)] right-[calc(var(--ticket-notch)+6px)] z-[2] border-b border-dashed border-current opacity-30"
            />
          </div>
          <div className="relative min-h-0 min-w-0 overflow-hidden">{stub}</div>
        </article>
      </div>
    </div>
  );
}
