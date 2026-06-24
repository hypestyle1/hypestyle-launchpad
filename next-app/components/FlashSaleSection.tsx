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

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-mono font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(36px, 7vw, 80px)', color: '#ff2d2d', letterSpacing: '-0.03em' }}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-white/40">
        {label}
      </span>
    </div>
  );
}

interface SaleStatus { count: number; limit: number; full: boolean }

export default function FlashSaleSection() {
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

  const isFull  = status?.full ?? false;
  const count   = status?.count ?? 0;
  const limit   = status?.limit ?? 100;
  const pct     = status ? Math.min(100, Math.round((count / limit) * 100)) : 0;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px',
        }}
      />

      {/* Red glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,45,45,0.12) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-[900px] mx-auto px-6 py-16 md:py-20 flex flex-col items-center text-center gap-8">

        {/* Tag */}
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-white/20" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-white/50">
            50.000 personas · gracias por acompañarnos
          </span>
          <div className="h-px w-8 bg-white/20" />
        </div>

        {/* Headline */}
        <div className="flex flex-col items-center gap-2">
          <h2
            className="font-black uppercase leading-none tracking-[-0.04em] text-white"
            style={{ fontSize: 'clamp(56px, 14vw, 160px)' }}
          >
            50<span style={{ color: '#ff2d2d' }}>%</span>
          </h2>
          <p
            className="font-black uppercase text-white/80"
            style={{ fontSize: 'clamp(16px, 3.5vw, 36px)', letterSpacing: '0.12em' }}
          >
            OFF en toda la tienda
          </p>
        </div>

        {/* Order limit counter */}
        <div className="w-full max-w-[400px] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/40">
              {isFull ? 'Cupos agotados' : 'Cupos disponibles'}
            </span>
            <span
              className="text-[13px] font-black tabular-nums"
              style={{ color: isFull ? '#ff2d2d' : '#fff' }}
            >
              {isFull ? `${limit}/${limit}` : `${count}/${limit}`}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-[3px] bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: status ? `${pct}%` : '0%',
                background: isFull ? '#ff2d2d' : 'linear-gradient(90deg, #ff2d2d 0%, #ff6b6b 100%)',
              }}
            />
          </div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-white/30">
            Primeras 100 órdenes o hasta el 25 jun a las 22hs
          </p>
        </div>

        {/* Countdown */}
        {!isFull && (
          <div className="flex items-start gap-4 md:gap-8">
            <TimeUnit value={pad(time.h)} label="horas" />
            <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(30px, 6vw, 70px)' }}>:</span>
            <TimeUnit value={pad(time.m)} label="minutos" />
            <span className="font-mono font-black text-white/20 leading-none mt-1" style={{ fontSize: 'clamp(30px, 6vw, 70px)' }}>:</span>
            <TimeUnit value={pad(time.s)} label="segundos" />
          </div>
        )}

        {/* CTA */}
        {isFull ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px] font-black tracking-[0.2em] uppercase" style={{ color: '#ff2d2d' }}>
              Los 100 cupos se agotaron
            </p>
            <p className="text-[11px] tracking-[0.12em] uppercase text-white/40">
              Gracias a todos los que participaron
            </p>
          </div>
        ) : (
          <Link
            href="/productos/"
            className="group inline-flex items-center gap-3 px-8 py-4 font-black text-[11px] tracking-[0.2em] uppercase transition-all duration-200"
            style={{ background: '#ff2d2d', color: '#fff' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#fff';
              (e.currentTarget as HTMLElement).style.color = '#0a0a0a';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = '#ff2d2d';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
          >
            Comprar ahora
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-200 group-hover:translate-x-1">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )}

      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />
    </section>
  );
}
