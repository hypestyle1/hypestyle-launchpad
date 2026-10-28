'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cuenta regresiva al próximo hito de CYBER HYPE (reutilizada del PR #623, sin
 * la lógica de cartelera).
 *
 * El hito lo decide el SERVIDOR (lib/cyber-hype.ts → cyberProximoHito) y llega
 * por props: acá no se calcula ningún estado, solo se dibuja el tiempo que
 * falta. Así el browser no puede adelantar la apertura cambiándose la fecha.
 *
 * El primer render tiene que coincidir con el del servidor, así que arranca en
 * null y los dígitos aparecen al montar (sin esto, error de hidratación).
 * Cuando llega a cero pide un refresh: el estado nuevo lo calcula el servidor.
 */
export default function CyberCountdown({ targetIso, label }: { targetIso: string; label: string }) {
  const router = useRouter();
  const target = new Date(targetIso).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</p>
      <div className="mt-2.5 flex items-start gap-5 sm:gap-7" aria-live="off">
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
      <span className="text-[34px] sm:text-[44px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums text-white">
        {value === null ? '--' : String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</span>
    </div>
  );
}
