'use client';

import { useState, useEffect } from 'react';

const EVENT_START = new Date('2026-05-10T00:00:00-03:00');
const EVENT_END   = new Date('2026-05-13T23:59:59-03:00');

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
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function Unit({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (value === prev) return;
    setFlip(true);
    const t = setTimeout(() => { setPrev(value); setFlip(false); }, 200);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <span
        className="text-[30px] md:text-[40px] font-bold tabular-nums leading-none"
        style={{
          transition: 'opacity 200ms, transform 200ms',
          opacity: flip ? 0 : 1,
          transform: flip ? 'translateY(-6px)' : 'none',
        }}
      >
        {String(prev).padStart(2, '0')}
      </span>
      <span className="text-[8px] uppercase tracking-[0.25em] text-white/35 mt-1.5">{label}</span>
    </div>
  );
}

export default function EventCountdown() {
  const now = Date.now();
  if (now > EVENT_END.getTime()) return null;

  const live = now >= EVENT_START.getTime();
  const { d, h, m, s } = useCountdown(EVENT_START);

  return (
    <div className="bg-bg-dark text-white">
      <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-5">

        {/* Left */}
        <div className="text-center md:text-left">
          <p className="text-[9px] uppercase tracking-[0.35em] text-white/35 mb-1">
            {live ? 'En curso — 10 al 13 de Mayo' : 'Próximamente — 10 al 13 de Mayo'}
          </p>
          <p className="text-[17px] md:text-[20px] font-bold uppercase tracking-tight leading-tight">
            {live ? 'Ofertas exclusivas activas' : 'Mega Drop · Descuentos exclusivos'}
          </p>
        </div>

        {/* Countdown */}
        {!live && (
          <div className="flex items-center gap-4 md:gap-6">
            <Unit value={d} label="Días" />
            <span className="text-white/20 text-[24px] font-thin mb-4">:</span>
            <Unit value={h} label="Horas" />
            <span className="text-white/20 text-[24px] font-thin mb-4">:</span>
            <Unit value={m} label="Min" />
            <span className="text-white/20 text-[24px] font-thin mb-4">:</span>
            <Unit value={s} label="Seg" />
          </div>
        )}

        {/* CTA */}
        <a
          href="/productos/"
          className="text-[10px] uppercase tracking-[0.25em] border border-white/25 hover:bg-white hover:text-black transition-all duration-300 px-7 py-3 whitespace-nowrap"
        >
          {live ? 'Ver ofertas' : 'Ver productos'}
        </a>

      </div>
    </div>
  );
}
