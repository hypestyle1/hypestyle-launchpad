import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Borde con un haz de luz que recorre el contorno (estilo "border beam").
 * Hecho con CSS, sin dependencias: un cuadrado con conic-gradient gira detrás
 * del contenido y solo asoma en el borde de `grosor` px. Dos tramos opuestos
 * de un solo color, lentos, para que siempre haya luz en algún borde sin distraer. Con prefers-reduced-motion queda el
 * borde quieto, sin el haz.
 */
export function BorderBeam({
  children,
  className,
  innerClassName,
  color = 'rgba(34,197,94,0.95)',
  duracion = 7,
  radio = 10,
  grosor = 1,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  color?: string;
  /** Segundos por vuelta. */
  duracion?: number;
  radio?: number;
  grosor?: number;
}) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ borderRadius: radio, padding: grosor }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[250%] -translate-x-1/2 -translate-y-1/2 animate-spin motion-reduce:hidden"
        style={{
          animationDuration: `${duracion}s`,
          // Cada haz: estela que se enciende de a poco (90°) y punta brillante.
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 80deg, ${color} 170deg, ${color} 178deg, transparent 180deg, transparent 260deg, ${color} 350deg, ${color} 358deg, transparent 360deg)`,
        }}
      />
      <div className={cn('relative', innerClassName)} style={{ borderRadius: Math.max(0, radio - grosor) }}>
        {children}
      </div>
    </div>
  );
}
