'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const EVENT_END = new Date('2026-05-13T23:59:59-03:00');

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function SpecialPricesHero() {
  const { d, h, m, s } = useCountdown(EVENT_END);
  const ended = Date.now() > EVENT_END.getTime();
  if (ended) return null;

  return (
    <section className="bg-bg-dark text-white py-10 md:py-14 px-6">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Image src="/hypeweek-logo-white.png" alt="Hypeweek" width={160} height={48} className="object-contain" />
            <span className="border border-white/25 text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 text-white/60">
              Termina el 13 de Mayo
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Descuentos exclusivos — 10 · 11 · 12 · 13 de Mayo
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {[{ v: d, l: 'Días' }, { v: h, l: 'Hs' }, { v: m, l: 'Min' }, { v: s, l: 'Seg' }].map(({ v, l }, i) => (
            <div key={l} className="flex items-center gap-2 md:gap-4">
              {i > 0 && <span className="text-white/20 text-[20px] font-thin mb-4">:</span>}
              <div className="flex flex-col items-center">
                <span className="text-[32px] md:text-[44px] font-bold tabular-nums leading-none">{pad(v)}</span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-white/35 mt-1">{l}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
