'use client';

import { useEffect, useState } from 'react';

/**
 * La cuenta regresiva chica del top bar (bloque 01 del takeover).
 *
 * Va fijada a la IZQUIERDA de la pastilla de `AnnouncementBar`, fuera del
 * marquee: dentro del marquee los dígitos se mueven y además cambian de ancho
 * cada segundo, así que el texto de al lado saltaba. Acá queda quieta y el
 * marquee corre a su derecha.
 *
 * `target` es un timestamp (número) resuelto por el SERVIDOR
 * (`lib/hype72-home.ts`). Acá solo se dibuja el tiempo que falta: el estado del
 * evento no lo decide el reloj del navegador.
 *
 * Primer render = el del servidor (`restante(target, inicial)`), con `inicial`
 * también del servidor: sin eso el HTML del servidor y el del cliente
 * difieren en los segundos y React tira error de hidratación.
 */

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function restante(target: number, ahora: number) {
  const diff = target - ahora;
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
  };
}

/** `2d 14:03:22` o `14:03:22` cuando falta menos de un día. */
export function textoRestante(target: number, ahora: number): string | null {
  const t = restante(target, ahora);
  if (!t) return null;
  const hms = `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
  return t.d > 0 ? `${t.d}d ${hms}` : hms;
}

interface Props {
  /** Instante al que apunta, en ms. Lo calcula el servidor. */
  target: number;
  /** Hora del servidor en el render, en ms. Evita el mismatch de hidratación. */
  ahora: number;
  /** "Arranca en" / "Termina en". */
  label: string;
}

export default function Hype72MiniCountdown({ target, ahora, label }: Props) {
  const [texto, setTexto] = useState(() => textoRestante(target, ahora));

  useEffect(() => {
    // Desde el montaje se usa el reloj del navegador, que es el único que
    // avanza. Si ya pasó el instante, el componente desaparece solo y el
    // próximo render del servidor (ISR, 60 s) ya trae el estado nuevo.
    const tick = () => setTexto(textoRestante(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!texto) return null;

  return (
    <span className="flex items-center gap-1.5 flex-shrink-0 pl-3 pr-2.5 border-r border-white/10">
      <span className="text-[9px] font-medium tracking-[0.12em] uppercase text-white/45 hidden sm:inline">
        {label}
      </span>
      <span
        className="text-[10px] font-semibold tabular-nums tracking-[0.04em]"
        style={{ color: 'var(--hype72-acento)' }}
      >
        {texto}
      </span>
    </span>
  );
}
