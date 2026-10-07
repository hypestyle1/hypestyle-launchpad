'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function timeLeft(to: string) {
  const diff = new Date(to).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Cuenta regresiva a la apertura pública. Al llegar a cero refresca la página
 * cada minuto: el servidor decide si ya hay productos publicados (el cron
 * corre cada 10 min y revalida esta ruta al abrir).
 */
export default function Ss27Countdown({ to }: { to: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<ReturnType<typeof timeLeft> | undefined>(undefined);

  useEffect(() => {
    const tick = () => setLeft(timeLeft(to));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);

  const done = left === null;
  useEffect(() => {
    if (!done) return;
    router.refresh();
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [done, router]);

  if (done) {
    return <p className="text-[13px] uppercase tracking-[0.18em] text-white/70">Abriendo la colección</p>;
  }

  const units = [
    { v: left?.d, u: 'días' },
    { v: left?.h, u: 'horas' },
    { v: left?.m, u: 'min' },
    { v: left?.s, u: 'seg' },
  ];

  return (
    <div className="flex items-stretch gap-[2px]" role="timer" aria-label="Tiempo para la apertura">
      {units.map((x) => (
        <div key={x.u} className="flex flex-col items-center justify-center w-[68px] md:w-[84px] py-3 md:py-4 bg-white/[0.06] border border-white/10">
          <span className="text-[26px] md:text-[34px] font-bold leading-none tabular-nums" suppressHydrationWarning>
            {x.v === undefined ? '--' : pad(x.v)}
          </span>
          <span className="mt-1.5 text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/45">{x.u}</span>
        </div>
      ))}
    </div>
  );
}
