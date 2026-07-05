'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PROMO_3X2_END, isPromo3x2Active } from '@/lib/promo-3x2';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getTimeLeft() {
  const diff = PROMO_3X2_END.getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { h, m, s };
}

export default function Promo3x2Bar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    setActive(isPromo3x2Active());
    const tick = setInterval(() => {
      const t = getTimeLeft();
      setTime(t);
      if (!t) setActive(false);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  if (!active || !time || pathname?.startsWith('/admin')) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] h-[40px] flex items-center justify-center gap-3 px-4"
      style={{ background: '#0a0a0a' }}
    >
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: '#ff2d2d' }}>
          3X2
        </span>
        <span className="text-white/20 text-[10px]">·</span>
        <span className="text-[10px] font-black tracking-[0.14em] uppercase text-white">
          en todo el catálogo
        </span>
      </div>

      <span className="text-white/15 text-[10px] hidden sm:block">·</span>

      <div
        className="flex items-center gap-px font-mono text-[13px] font-bold tabular-nums shrink-0"
        style={{ color: '#ff2d2d' }}
      >
        <span>{pad(time.h)}</span>
        <span className="text-white/30 mx-[2px]">:</span>
        <span>{pad(time.m)}</span>
        <span className="text-white/30 mx-[2px]">:</span>
        <span>{pad(time.s)}</span>
      </div>

      <span className="text-white/15 text-[10px] hidden sm:block">·</span>

      <Link
        href="/productos/"
        className="hidden sm:flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase text-white border border-white/20 px-3 py-1 hover:bg-white hover:text-black transition-colors duration-150 shrink-0"
      >
        Comprar
      </Link>
    </div>
  );
}
