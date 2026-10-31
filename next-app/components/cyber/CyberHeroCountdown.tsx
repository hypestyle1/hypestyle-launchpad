'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* El countdown del hero: un módulo horizontal de ancho completo.

   ── Qué cambió ──────────────────────────────────────────────────────────────
   Antes era una tarjeta chica arrastrada a la derecha, con los dígitos
   peleando por espacio mientras media pantalla quedaba sin usar. Ahora es
   **una sola pieza que ocupa el ancho útil**: cuatro columnas iguales,
   números grandes, separadores verticales discretos y el rótulo arriba. Está
   pensado para leerse de un vistazo desde lejos, que es lo que hace un
   contador cuando de verdad apura.

   ── El vidrio ───────────────────────────────────────────────────────────────
   `backdrop-blur` + saturación sobre un fondo blanco al 12%, borde de 1,5 px
   y dos reflejos internos (uno arriba, uno abajo) que simulan el canto de una
   pieza de vidrio. Es el mismo lenguaje del navbar y del hero del sitio, así
   que no se lee como un widget pegado encima de la foto.

   ── La hora ─────────────────────────────────────────────────────────────────
   El instante objetivo lo decide el SERVIDOR (lib/cyber-hype, con offset
   -03:00 fijo) y llega por props: acá solo se dibuja lo que falta. Alguien
   que cambie la fecha de su computadora no abre ni cierra nada — solo vería
   mal su propio reloj. Al llegar a cero se le pide el estado nuevo al
   servidor.

   Arranca en null para que el primer render coincida con el del servidor (si
   no, error de hidratación). Con `prefers-reduced-motion` no hay transición
   en los dígitos: cambian secos. */

type Resto = { d: number; h: number; m: number; s: number };

function restante(ts: number): Resto {
  const diff = Math.max(0, ts - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

function Columna({ v, label }: { v: number | undefined; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-1">
      <span className="text-[34px] font-black leading-[1] tabular-nums text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.3)] sm:text-[40px] md:text-[44px]">
        {v === undefined ? '--' : String(v).padStart(2, '0')}
      </span>
      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/60 md:text-[10px]">
        {label}
      </span>
    </div>
  );
}

export default function CyberHeroCountdown({
  targetIso,
  label,
}: {
  targetIso: string;
  label: string;
}) {
  const router = useRouter();
  const objetivo = new Date(targetIso).getTime();
  const [t, setT] = useState<Resto | null>(null);

  useEffect(() => {
    const tick = () => setT(restante(objetivo));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  useEffect(() => {
    if (!t || t.d + t.h + t.m + t.s > 0) return;
    const id = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(id);
  }, [t, router]);

  return (
    <div
      className="w-full rounded-[18px] border-[1.5px] border-white/30 bg-white/[0.12] px-4 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.12)] backdrop-blur-[28px] [backdrop-filter:blur(28px)_saturate(1.6)] md:rounded-[20px] md:px-6 md:py-5"
      role="timer"
      aria-label={`${label}: ${t ? `${t.d} días, ${t.h} horas, ${t.m} minutos` : 'calculando'}`}
    >
      <p className="mb-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-white/65 md:mb-3 md:text-[10px]">
        {label}
      </p>
      <div className="flex items-stretch divide-x divide-white/20">
        <Columna v={t?.d} label="Días" />
        <Columna v={t?.h} label="Hs" />
        <Columna v={t?.m} label="Min" />
        <Columna v={t?.s} label="Seg" />
      </div>
    </div>
  );
}
