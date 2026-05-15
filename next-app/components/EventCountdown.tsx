'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const EVENT_START = new Date('2026-05-10T00:00:00-03:00');
const EVENT_END = new Date('2026-05-17T23:59:59-03:00');

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

function Digit({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (value === prev) return;
    setFlip(true);
    const t = setTimeout(() => { setPrev(value); setFlip(false); }, 150);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-[32px] md:text-[44px] font-black tabular-nums leading-none"
        style={{ transition: 'opacity 150ms', opacity: flip ? 0 : 1 }}
      >
        {pad(prev)}
      </span>
      <span className="text-[7px] uppercase tracking-[0.2em] text-white/35">{label}</span>
    </div>
  );
}

export default function EventCountdown() {
  const now = Date.now();
  if (now > EVENT_END.getTime()) return null;

  const live = now >= EVENT_START.getTime();
  const { d, h, m, s } = useCountdown(EVENT_END);

  return (
    <div className="bg-[#0a0a0a] text-white py-6 md:py-5 px-6 md:px-10 border-y border-white/8">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-0">

        {/* Left — logo + dates */}
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <Image
            src="/hypeweek-logo-white.png"
            alt="Hypeweek"
            width={130}
            height={38}
            className="object-contain"
          />
          <p className="text-[8px] uppercase tracking-[0.28em] text-white/35">
            {live ? 'En curso —' : ''} Descuentos exclusivos · 10 · 11 · 12 · 13 · 14 · 15 · 16 · 17 de Mayo
          </p>
        </div>

        {/* Center — countdown */}
        <div className="flex items-start justify-center gap-3 md:gap-5">
          <Digit value={d} label="Días" />
          <span className="text-white/20 text-[26px] font-thin mt-0.5">:</span>
          <Digit value={h} label="Horas" />
          <span className="text-white/20 text-[26px] font-thin mt-0.5">:</span>
          <Digit value={m} label="Min" />
          <span className="text-white/20 text-[26px] font-thin mt-0.5">:</span>
          <Digit value={s} label="Seg" />
        </div>

        {/* Right — CTA */}
        <div className="flex justify-center md:justify-end">
          <Link
            href="/special-prices/"
            className="bg-white text-black text-[9px] font-bold uppercase tracking-[0.22em] px-8 py-3 hover:bg-white/85 transition-colors"
          >
            Ver Ofertas
          </Link>
        </div>

      </div>
    </div>
  );
}
