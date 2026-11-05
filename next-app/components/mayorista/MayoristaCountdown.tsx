'use client';

import { useEffect, useState } from 'react';

// Cuenta regresiva al cierre de una campaña mayorista (Flash Cyber, 05/11/2026).
// Se pinta recién en el cliente para no chocar la hidratación con la hora del
// server; al llegar a 0 queda en 00 (el server deja de aplicar la campaña solo).

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function MayoristaCountdown({ endsAt }: { endsAt: string }) {
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!Number.isFinite(end)) return null;
  const p = parts(now === null ? 0 : end - now);
  const cells: [string, number][] = [['días', p.d], ['hs', p.h], ['min', p.m], ['seg', p.s]];

  return (
    <div className="flex items-stretch gap-1.5 sm:gap-2" role="timer" aria-label="Tiempo restante del Flash">
      {cells.map(([label, v]) => (
        <div key={label} className="min-w-[56px] sm:min-w-[64px] rounded-[10px] border border-primary-foreground/25 bg-primary-foreground/[0.06] px-2 py-2 text-center">
          <div className="text-[22px] sm:text-[26px] font-bold tabular-nums leading-none">{now === null ? '--' : pad(v)}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-primary-foreground/55">{label}</div>
        </div>
      ))}
    </div>
  );
}
