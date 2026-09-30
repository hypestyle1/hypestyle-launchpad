'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Los botones flotantes del pie (WhatsApp, reproductor, pastilla de reseñas
 * en mobile) leen `--hs-bottom-shift` y suben esa distancia. Lo que aparezca
 * pegado abajo (cartel de cookies, barra del newsletter) la fija con su
 * propia altura mientras está en pantalla, y la devuelve a 0 al irse.
 * Así nada queda tapado y no hace falta que cada botón sepa qué hay abajo.
 */
const VAR = '--hs-bottom-shift';

export function useBottomShift(ref: RefObject<HTMLElement | null>, active = true, gap = 12) {
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty(VAR, `${Math.round(el.getBoundingClientRect().height) + gap}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.setProperty(VAR, '0px'); };
  }, [ref, active, gap]);
}

/** Para los botones: `bottom: calc(<base>px + var(--hs-bottom-shift))`, con transición. */
export function shiftedBottom(basePx: number): React.CSSProperties {
  return { bottom: `calc(${basePx}px + var(${VAR}, 0px))`, transition: 'bottom 0.3s ease' };
}
