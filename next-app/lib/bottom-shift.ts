'use client';

import { useEffect, useId, type RefObject } from 'react';

/**
 * Los botones flotantes del pie (WhatsApp, reproductor, pastilla de reseñas
 * en mobile) leen `--hs-bottom-shift` y suben esa distancia. Lo que aparezca
 * pegado abajo (cartel de cookies, barra del newsletter, barra fija de compra
 * de la ficha) registra su alto mientras está en pantalla y lo saca al irse.
 * Así nada queda tapado y no hace falta que cada botón sepa qué hay abajo.
 *
 * Pueden convivir varias cosas abajo a la vez (el cartel de cookies y la barra
 * de la ficha, por ejemplo). Todas están pegadas al borde, así que se pisan
 * entre ellas: los flotantes suben lo que mide la más alta. Antes había un solo
 * valor y ganaba el último que escribía; al irse uno, lo dejaba en 0 aunque el
 * otro siguiera abajo.
 */
const VAR = '--hs-bottom-shift';
const sources = new Map<string, number>();

function publish() {
  const max = sources.size ? Math.max(...sources.values()) : 0;
  document.documentElement.style.setProperty(VAR, `${max}px`);
}

export function useBottomShift(ref: RefObject<HTMLElement | null>, active = true, gap = 12) {
  const id = useId();
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      sources.set(id, Math.round(el.getBoundingClientRect().height) + gap);
      publish();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      sources.delete(id);
      publish();
    };
  }, [ref, active, gap, id]);
}

/**
 * Para los botones: quedan a `<base>px` del borde y suben con `translate`, no
 * con `bottom`. Animar `bottom` es layout en cada frame y Chrome lo cuenta como
 * layout shift; `translate` no, y no choca con el `scale` del hover (que va por
 * `transform`).
 */
export function shiftedBottom(basePx: number): React.CSSProperties {
  return {
    bottom: `${basePx}px`,
    translate: `0 calc(-1 * var(${VAR}, 0px))`,
    transition: 'translate 0.3s ease, transform 0.2s ease, opacity 0.3s ease, visibility 0.3s',
  };
}

// ── Barra fija de compra de la ficha ─────────────────────────────────────────
// La ficha avisa cuándo está a la vista; hooks/useMobileFloatGate.ts la escucha
// para decidir cuándo aparece WhatsApp.

let buyBar = false;
const buyBarListeners = new Set<() => void>();

/** La ficha avisa si su barra fija de compra está a la vista. */
export function setBuyBarVisible(v: boolean) {
  if (buyBar === v) return;
  buyBar = v;
  buyBarListeners.forEach((l) => l());
}

export function subscribeBuyBar(l: () => void) {
  buyBarListeners.add(l);
  return () => buyBarListeners.delete(l);
}

export const getBuyBarVisible = () => buyBar;
