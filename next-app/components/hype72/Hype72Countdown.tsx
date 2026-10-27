'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cuenta regresiva al próximo hito de HYPE 72.
 *
 * El hito lo decide el SERVIDOR (lib/hype72.ts → nextMilestone) y llega por
 * props: acá no se calcula ningún estado, solo se dibuja el tiempo que falta.
 * Así el browser no puede "revelar" un drop antes de hora cambiándose la fecha.
 *
 * Cuando llega a cero pide un refresh del server component: el estado nuevo
 * (drop revelado o abierto) lo vuelve a calcular el servidor.
 */
export default function Hype72Countdown({ targetIso, label }: { targetIso: string; label: string }) {
  const router = useRouter();
  const target = new Date(targetIso).getTime();

  // El primer render es el del servidor y tiene que coincidir con el del
  // cliente: arranca en null y los dígitos aparecen al montar.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  // Llegó a cero: el server tiene que recalcular el estado de la cartelera.
  useEffect(() => {
    if (left !== 0) return;
    const id = setTimeout(() => router.refresh(), 1200);
    return () => clearTimeout(id);
  }, [left, router]);

  const d = left === null ? null : Math.floor(left / 86_400_000);
  const h = left === null ? null : Math.floor((left % 86_400_000) / 3_600_000);
  const m = left === null ? null : Math.floor((left % 3_600_000) / 60_000);
  const s = left === null ? null : Math.floor((left % 60_000) / 1000);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</p>
      <div className="mt-2.5 flex items-start gap-4 sm:gap-6" aria-live="off">
        <Unit value={d} label="Días" />
        <Unit value={h} label="Horas" />
        <Unit value={m} label="Min" />
        <Unit value={s} label="Seg" />
      </div>
    </div>
  );
}

function Unit({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[38px] sm:text-[48px] font-black leading-[0.85] tabular-nums tracking-tight">
        {value === null ? '--' : String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</span>
    </div>
  );
}
