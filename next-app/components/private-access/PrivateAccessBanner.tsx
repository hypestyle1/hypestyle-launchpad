'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import UnlockModal from './UnlockModal';
import { PRIVATE_ACCESS_FLAG_COOKIE, PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import './private-access.css';

interface Props {
  /** Resuelto en el servidor (fecha/override). Si es false el bloque no existe. */
  active: boolean;
  collectionName: string;
  discountPct: number;
  /** `10.10` */
  saleEndsLabel: string;
}

function hasFlagCookie(): boolean {
  try { return document.cookie.split('; ').some(c => c === `${PRIVATE_ACCESS_FLAG_COOKIE}=1`); } catch { return false; }
}

/**
 * Bloque del home: primero de la "cortina" blanca, antes de New In. Card de
 * vidrio charcoal (el mismo lenguaje que el modal) con un resplandor verde
 * muy leve en una esquina, apaisada en desktop (titular a la izquierda, copy
 * y botón a la derecha) y apilada en mobile. El HTML ya sale con el bloque
 * desde el servidor (sin salto de layout); lo único que cambia en el cliente
 * es el botón, si la persona ya desbloqueó.
 */
export default function PrivateAccessBanner({ active, collectionName, discountPct, saleEndsLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => { setUnlocked(hasFlagCookie()); }, [open]);

  if (!active) return null;

  // Sobre charcoal, el botón blanco es el que más contrasta (el negro puro
  // desaparecería). Mismo botón que usa el modal y el gate.
  const cta = 'group inline-flex items-center gap-3 h-[50px] md:h-[54px] pl-7 pr-5 rounded-full bg-white text-[#0a0a0a] text-[12px] font-bold uppercase tracking-[0.24em] transition-colors hover:bg-white/90';

  return (
    <>
      <section aria-label="Private Access" className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 pt-6 md:pt-10 pb-0">
          <div className="pa-glass-charcoal relative overflow-hidden rounded-[22px] md:rounded-[28px] text-white">
            {/* Verde como acento: un resplandor en una esquina, no un fondo. */}
            <div className="pa-glow-dark" aria-hidden />
            <div className="pa-grain" aria-hidden />

            <div className="relative px-6 py-8 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center gap-7 md:gap-12 text-center md:text-left">
              {/* Titular */}
              <div className="md:flex-1 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-2.5 mb-4 md:mb-5">
                  <span className="pa-dot pa-dot-green" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">
                    Mejores Amigos
                  </span>
                </div>
                {/* 7.4vw: a 390px de ancho entra "SPRING SUMMER 27" en una línea
                    dentro de la card (310px útiles). En desktop se achica para
                    que el bloque quede apaisado. */}
                <h2 className="font-bold uppercase leading-[0.92] tracking-[-0.035em]" style={{ fontSize: 'clamp(24px, 7.4vw, 46px)' }}>
                  <span className="block whitespace-nowrap text-white">Spring Summer 27</span>
                  <span className="block whitespace-nowrap text-white/50">Private Access</span>
                </h2>
              </div>

              <div className="hidden md:block w-px self-stretch bg-white/10" aria-hidden />

              {/* Copy + CTA */}
              <div className="md:flex-1 flex flex-col items-center md:items-start gap-5 md:gap-6">
                <p className="text-[14px] md:text-[16px] leading-relaxed text-white/65 max-w-[420px]">
                  Preventa exclusiva para Mejores Amigos.{' '}
                  <span className="whitespace-nowrap">
                    <span className="pa-pill-green pa-pill-green--dark">{discountPct}% OFF</span> hasta el {saleEndsLabel}.
                  </span>
                </p>

                {unlocked ? (
                  <Link href={PRIVATE_ACCESS_PATH} className={cta}>
                    Acceder
                    <ArrowRight size={16} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <button onClick={() => setOpen(true)} className={cta}>
                    Acceder
                    <ArrowRight size={16} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}

                <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
                  Disponible antes que nadie.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <UnlockModal open={open} onClose={() => setOpen(false)} collectionName={collectionName} />
    </>
  );
}
