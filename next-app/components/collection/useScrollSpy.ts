'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scrollspy del índice de colección (reemplaza al IntersectionObserver de
 * Ss27Feed). Activo = el último heading cuyo top ya cruzó la línea de
 * activación (el offset del sticky + un margen), evaluado con un listener de
 * scroll pasivo + rAF.
 *
 * Por qué no IO: tras un salto por ancla el IO podía no disparar ninguna
 * entrada "intersecting" y el índice quedaba marcando la sección vieja (SS-11).
 * Acá el click fija el activo al instante y el cálculo por posición se
 * re-sincroniza solo al terminar el scroll — no hay estado que pueda quedar
 * desactualizado.
 */
export function useScrollSpy(ids: string[], prefix = '') {
  const [active, setActive] = useState(ids[0] ?? '');
  // Tras un click en ancla, el cálculo se pausa un instante para que el scroll
  // suave no vaya "pintando" todas las secciones intermedias.
  const pauseUntil = useRef(0);
  const key = ids.join(',');

  useEffect(() => {
    if (!ids.length) return;
    let raf = 0;
    const line = () => {
      const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--offset')) || 90;
      return offset + 140; // la franja de activación queda bajo el índice sticky
    };
    const compute = () => {
      raf = 0;
      if (Date.now() < pauseUntil.current) return;
      const y = line();
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(prefix + id);
        if (el && el.getBoundingClientRect().top <= y) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, prefix]);

  /** Llamar en el onClick de cada ancla: fija el activo de inmediato (fix SS-11). */
  const onAnchorClick = useCallback((id: string) => {
    setActive(id);
    pauseUntil.current = Date.now() + 700;
  }, []);

  return { active, onAnchorClick };
}
