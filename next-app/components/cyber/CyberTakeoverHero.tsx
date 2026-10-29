'use client';

import { useEffect, useState } from 'react';
import CyberWordmark from './CyberWordmark';
import './cyber.css';

/* Hero del takeover de CYBER HYPE — recuperado del preview del 27/10 (rama
   identidad) y adaptado a la dirección definitiva del 29/10:
   - MONOCROMO: negro, blanco y grises. Los resplandores cian/rosa del preview
     se retiraron; el punto EN VIVO es blanco.
   - Wordmark oficial con el reveal de franjas continuo (CyberWordmark).
   - La card editorial usa la MISMA geometría del hero actual del sitio:
     full-bleed en mobile, gutters de 16px y radius 24 en desktop, scrims para
     legibilidad, countdown en tarjeta liquid glass.
   - Fotos reales del lookbook FW26 (Rio), ya publicadas en el sitio.
   El countdown apunta SIEMPRE al cierre que decide el servidor (targetIso por
   props): acá no se calcula ninguna fecha. */

const FOTO_DESKTOP = '/lookbook-fw26/hero/6428.webp';
const FOTO_MOBILE = '/lookbook-fw26/hero/6442.webp';

type Restante = { d: number; h: number; m: number; s: number };

function restanteHasta(ts: number): Restante {
  const diff = Math.max(0, ts - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

function Digito({ v, label }: { v: number | undefined; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[22px] font-black leading-none tabular-nums text-white md:text-[32px]">
        {v === undefined ? '--' : String(v).padStart(2, '0')}
      </span>
      <span className="text-[8px] uppercase tracking-[0.22em] text-white/55 md:text-[9px]">{label}</span>
    </div>
  );
}

export default function CyberTakeoverHero({
  targetIso,
  ultimasHoras,
}: {
  /** El cierre del evento (lo resuelve el servidor con lib/cyber-hype). */
  targetIso: string;
  ultimasHoras: boolean;
}) {
  const objetivo = new Date(targetIso).getTime();
  // Arranca sin valor: un Date.now() en el primer render rompe la hidratación.
  const [t, setT] = useState<Restante | null>(null);

  useEffect(() => {
    setT(restanteHasta(objetivo));
    const id = setInterval(() => setT(restanteHasta(objetivo)), 1000);
    return () => clearInterval(id);
  }, [objetivo]);

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-[#0a0a0a] md:px-4 md:pb-4 md:pt-[calc(var(--offset)+6px)]">
      <div className="relative h-full w-full overflow-hidden rounded-none bg-[#141414] md:rounded-[24px]">
        <img
          src={FOTO_DESKTOP}
          alt="Editorial Hype — lookbook Rio"
          className="absolute inset-0 hidden h-full w-full object-cover md:block"
          style={{ objectPosition: '66% 30%' }}
        />
        <img
          src={FOTO_MOBILE}
          alt="Editorial Hype — lookbook Rio"
          className="absolute inset-0 h-full w-full object-cover md:hidden"
          style={{ objectPosition: '55% 18%' }}
        />

        {/* Scrims: base para el bloque de texto + franja superior para el navbar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />

        {/* Mini masthead dentro de la card */}
        <div className="absolute inset-x-5 top-[calc(var(--offset)+10px)] flex items-center justify-between md:inset-x-12 md:top-7">
          <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] md:text-[10px]">
            HYPE® STYLE&CULTURE
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/[0.14] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-[24px] md:text-[10px]">
            <span className="cyber-live-dot h-1.5 w-1.5 rounded-full bg-white" />
            {ultimasHoras ? 'Últimas horas' : 'En vivo'}
          </span>
        </div>

        {/* Bloque principal */}
        <div className="absolute inset-x-5 bottom-6 flex flex-col gap-2.5 md:inset-x-12 md:bottom-10 md:gap-3">
          <div className="flex flex-col gap-0.5 md:gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] md:text-[13px]">
              {ultimasHoras ? 'Termina hoy · 23:59' : '2 · 3 · 4 de noviembre'}
            </span>
            <h1 className="text-[clamp(44px,13vw,56px)] leading-[0.84] [text-shadow:0_2px_24px_rgba(0,0,0,0.45)] md:text-[clamp(76px,7.6vw,118px)]">
              <CyberWordmark animate tone="dark" />
            </h1>
            <p className="max-w-[520px] text-[14px] leading-[1.45] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] md:text-[16px]">
              Tres días. Un drop nuevo cada día, el 4 PACK de Regular Tees y el archivo abierto.
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            {/* CTAs */}
            <div className="flex items-center gap-3">
              <a
                href="#catalogo"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a] transition-transform duration-300 hover:scale-[1.03] md:flex-none md:px-9 md:py-4 md:text-[14px]"
              >
                Comprar ahora
              </a>
              <a
                href="#drops"
                className="hidden items-center justify-center rounded-full border-[1.5px] border-white/55 bg-white/[0.10] px-7 py-[14.5px] text-[13px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-[24px] transition-colors duration-300 hover:bg-white/[0.18] md:inline-flex"
              >
                Los 3 drops
              </a>
            </div>

            {/* Countdown liquid glass (el mismo vidrio del hero actual) */}
            <div
              className="mr-20 inline-flex items-center gap-3 self-start rounded-[14px] border-[1.5px] border-white/40 bg-white/[0.14] px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.22),inset_0_1.5px_0_rgba(255,255,255,0.35)] backdrop-blur-[40px] [backdrop-filter:blur(40px)_saturate(1.4)] md:mr-0 md:gap-5 md:self-auto md:rounded-[18px] md:px-6 md:py-4"
            >
              <span className="max-w-[60px] text-[9px] uppercase leading-[1.5] tracking-[0.24em] text-white/70 md:text-[10px]">
                Termina en
              </span>
              <div className="flex items-start gap-3 md:gap-4">
                <Digito v={t?.d} label="días" />
                <Digito v={t?.h} label="hs" />
                <Digito v={t?.m} label="min" />
                <Digito v={t?.s} label="seg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
