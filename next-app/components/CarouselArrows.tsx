'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Flechas de desplazamiento para los carruseles de scroll horizontal.
 *
 * En desktop, un carrusel de estos no tiene forma visible de moverse: la barra
 * de scroll está oculta a propósito, la rueda del mouse desplaza en vertical y
 * no en horizontal, y el arrastre no se ve hasta que alguien lo prueba. O sea,
 * para el visitante el carrusel parece una fila cortada. Estas flechas son la
 * única señal de que hay más contenido al costado.
 *
 * Solo desde `md`: en mobile se desliza con el dedo y no hacen falta.
 */
export default function CarouselArrows({
  containerRef,
  deps = [],
  label,
}: {
  containerRef: RefObject<HTMLDivElement>;
  /** Igual que en useDragScroll: pasarlas si el contenido llega después de un fetch. */
  deps?: any[];
  /** Para los aria-label, ej. "reseñas" -> "Ver reseñas anteriores". */
  label: string;
}) {
  const [puedeIr, setPuedeIr] = useState({ atras: false, adelante: false });

  const revisar = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPuedeIr({ atras: el.scrollLeft > 4, adelante: el.scrollLeft < max - 4 });
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    revisar();
    el.addEventListener('scroll', revisar, { passive: true });
    // El ancho del contenedor cambia al rotar el teléfono o al cargar imágenes.
    const ro = new ResizeObserver(revisar);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', revisar);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const mover = (dir: 1 | -1) => {
    const el = containerRef.current;
    if (!el) return;
    // Un "paso" es casi un ancho de pantalla, dejando un pedazo de la tarjeta
    // anterior a la vista para que se entienda que la fila siguió.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  // Si no hay nada que desplazar, no mostrar controles muertos.
  if (!puedeIr.atras && !puedeIr.adelante) return null;

  const base =
    'hidden md:flex h-9 w-9 items-center justify-center border border-border rounded-[8px] transition-colors ' +
    'enabled:hover:bg-foreground enabled:hover:text-white enabled:hover:border-foreground disabled:opacity-30 disabled:cursor-default';

  return (
    <div className="hidden md:flex items-center gap-2">
      <button type="button" onClick={() => mover(-1)} disabled={!puedeIr.atras} aria-label={`Ver ${label} anteriores`} className={base}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => mover(1)} disabled={!puedeIr.adelante} aria-label={`Ver más ${label}`} className={base}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
