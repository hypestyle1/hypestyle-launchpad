'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';

/**
 * AnimatedList — adaptado de Magic UI (21st.dev) para Hype (9/11).
 *
 * Diferencias con el original:
 * - Usa `motion/react` (ya instalado; framer-motion viene como dependencia de
 *   `motion`), así que no suma paquetes.
 * - Los ítems se APILAN en orden (el nuevo entra abajo, como en un carrito) en
 *   vez de invertirse arriba. Cuando están todos, espera `pausa` ms y arranca
 *   de nuevo: es un loop que cuenta una historia, no un feed infinito.
 * - Solo anima mientras está en pantalla (useInView): fuera de vista no gasta.
 * - Con prefers-reduced-motion muestra todo, quieto.
 */
export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  /** ms entre un ítem y el siguiente. */
  delay?: number;
  /** ms que queda la lista completa antes de reiniciar. */
  pausa?: number;
}

export function AnimatedList({ className = '', children, delay = 1100, pausa = 3200 }: AnimatedListProps) {
  const items = React.Children.toArray(children);
  const reducir = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const enVista = useInView(ref, { margin: '-15% 0px' });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reducir || !enVista) return;
    const completo = n >= items.length;
    const t = setTimeout(() => setN(completo ? 0 : n + 1), completo ? pausa : n === 0 ? 450 : delay);
    return () => clearTimeout(t);
  }, [n, enVista, reducir, items.length, delay, pausa]);

  const visibles = reducir ? items : items.slice(0, n);

  return (
    <div ref={ref} className={`flex flex-col gap-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {visibles.map((item, i) => (
          <AnimatedListItem key={(item as React.ReactElement).key ?? i}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 350, damping: 34 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedList;
