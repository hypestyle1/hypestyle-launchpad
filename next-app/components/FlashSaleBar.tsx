'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FLASH_SALE_END, isFlashSaleActive } from '@/lib/flash-sale';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getTimeLeft() {
  const diff = FLASH_SALE_END.getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { h, m, s };
}

interface SaleStatus { count: number; limit: number; full: boolean }

export default function FlashSaleBar() {
  const [active, setActive] = useState(false);
  const [time, setTime] = useState(getTimeLeft);
  const [status, setStatus] = useState<SaleStatus | null>(null);

  useEffect(() => {
    setActive(isFlashSaleActive());

    const tick = setInterval(() => {
      const t = getTimeLeft();
      setTime(t);
      if (!t) setActive(false);
    }, 1000);

    async function fetchStatus() {
      try {
        const r = await fetch('/api/flash-sale-status');
        const d = await r.json();
        setStatus(d);
      } catch {}
    }
    fetchStatus();
    const poll = setInterval(fetchStatus, 30_000);

    return () => { clearInterval(tick); clearInterval(poll); };
  }, []);

  if (!active || !time) return null;

  const isFull = status?.full;
  const count  = status?.count ?? 0;
  const limit  = status?.limit ?? 100;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[70] h-[40px] flex items-center justify-center gap-3 px-4"
      style={{ background: '#0a0a0a' }}
    >
      {/* Copy */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase" style={{ color: '#ff2d2d' }}>
          50K en IG
        </span>
        <span className="text-white/20 text-[10px]">=</span>
        <span className="text-[10px] font-black tracking-[0.14em] uppercase text-white">
          50% OFF
        </span>
      </div>

      {/* Divider */}
      <span className="text-white/15 text-[10px] hidden sm:block">·</span>

      {/* Order counter */}
      {status && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <span
            className="text-[11px] font-black tabular-nums"
            style={{ color: isFull ? '#ff2d2d' : '#fff' }}
          >
            {isFull ? 'AGOTADO' : `${count}/${limit}`}
          </span>
          {!isFull && (
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-white/40">
              cupos
            </span>
          )}
        </div>
      )}

      <span className="text-white/15 text-[10px] hidden sm:block">·</span>

      {/* Countdown */}
      {!isFull && (
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
      )}

      {/* CTA */}
      {!isFull && (
        <Link
          href="/productos/"
          className="hidden sm:flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase text-white border border-white/20 px-3 py-1 hover:bg-white hover:text-black transition-colors duration-150 shrink-0"
        >
          Comprar
        </Link>
      )}
    </div>
  );
}
