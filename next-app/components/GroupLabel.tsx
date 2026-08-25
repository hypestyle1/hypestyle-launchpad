import type { ReactNode } from "react";

/**
 * Encabezado de categoría dentro de una sección del home (Conjuntos, Faith,
 * Remeras, Accesorios…).
 *
 * Antes era una etiqueta centrada entre dos líneas horizontales. Repetido en
 * cinco categorías seguidas, ese patrón cortaba la página en bloques sueltos y
 * metía aire muerto entre grilla y grilla. Acá va al ras de la izquierda, con
 * una sola línea fina abajo que ata el título a los productos que encabeza.
 */
export default function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-border pb-2 mb-[2px]">
      <span className="text-[11px] uppercase tracking-[0.22em] text-foreground font-semibold">
        {children}
      </span>
    </div>
  );
}
