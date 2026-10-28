'use client';

import { useEffect, useRef, useState } from 'react';
import './cyber.css';

/* Lettering animado de CYBER — tres efectos de "reveal" finito (0,7–1,5 s)
   que terminan SIEMPRE en texto perfectamente legible:

   A. scramble   — decode de caracteres, se fijan de izquierda a derecha (JS, rAF).
   B. distortion — entra desenfocado/estirado y asienta (CSS: filter + transform).
   C. slices     — fragmentación monocroma por franjas horizontales desplazadas,
                   adaptación del footer de rotten-future.com (verificado en vivo:
                   pseudo-elementos con content:attr(data-text), clip-path:inset()
                   animado por franjas y copias corridas ±8px, UN solo color).
                   Acá el loop infinito se vuelve un reveal con fin, y las copias
                   no llevan fondo opaco para funcionar sobre fotografía.

   Sin dependencias; transform/filter/clip-path solamente (cero layout shift:
   el texto final reserva el espacio desde el primer frame). Con
   prefers-reduced-motion se muestra el texto estático directo. */

export type CyberEffect = 'scramble' | 'distortion' | 'slices';

const CHARS = 'ABCDEFGHIKMNORSTUVXYZ01247#/<>_';

export default function CyberLettering({
  text,
  effect,
  play = 0,
  durationMs = 1000,
  className = '',
}: {
  text: string;
  effect: CyberEffect;
  play?: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(text);
  const [running, setRunning] = useState(false);
  const reduced = useRef<boolean | null>(null);

  useEffect(() => {
    if (reduced.current === null) {
      reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (reduced.current) {
      setDisplay(text);
      setRunning(false);
      return;
    }

    if (effect === 'scramble') {
      setRunning(true);
      const t0 = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / durationMs);
        const fijas = Math.floor(p * text.length);
        let out = text.slice(0, fijas);
        for (let i = fijas; i < text.length; i++) {
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        setDisplay(out);
        if (p < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setDisplay(text);
          setRunning(false);
        }
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }

    // distortion / slices: animaciones CSS — se reinician re-montando por key
    setDisplay(text);
    setRunning(true);
    const id = setTimeout(() => setRunning(false), durationMs + 120);
    return () => clearTimeout(id);
  }, [play, effect, text, durationMs]);

  const style = { '--cyber-dur': `${durationMs}ms` } as React.CSSProperties;

  if (effect === 'scramble') {
    return (
      <span className={`relative inline-block whitespace-nowrap ${className}`}>
        {/* el texto final reserva el ancho; el scramble pinta encima */}
        <span className="opacity-0" aria-hidden="true">{text}</span>
        <span className="absolute inset-0" aria-label={text}>{display}</span>
      </span>
    );
  }

  if (effect === 'distortion') {
    return (
      <span className={`relative inline-block whitespace-nowrap ${className}`} style={style}>
        <span key={play} className={running ? 'cyber-fx-distort inline-block' : 'inline-block'}>{text}</span>
      </span>
    );
  }

  // slices
  return (
    <span className={`relative inline-block whitespace-nowrap ${className}`} style={style}>
      {running ? (
        <span key={play} className="cyber-fx-slices inline-block" data-text={text}>
          <span className="cyber-fx-slices__base inline-block">{text}</span>
        </span>
      ) : (
        <span className="inline-block">{text}</span>
      )}
    </span>
  );
}
