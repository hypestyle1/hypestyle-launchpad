'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  HYPE72_CIERRE_LABEL,
  HYPE72_CTA_EVENTO,
  HYPE72_FECHAS,
  HYPE72_LANDING,
  type Hype72HomeState,
} from '@/lib/hype72-home';
import { textoRestante } from './Hype72MiniCountdown';

/**
 * Banda del evento — bloque 03 del takeover.
 *
 * ESTO ES UN PLACEHOLDER LIMPIO, A PROPÓSITO.
 * La identidad visual de HYPE 72 se está diseñando aparte y se aplica encima
 * después (wireframes en `_claude/propuestas/HYPE72-IDENTIDAD/`). Lo que importa
 * de este PR es el mecanismo de activación y la reversibilidad, no la estética
 * fina. Entonces la banda:
 *  - NO toca el hero de siempre (`HeroSs27`), que sigue siendo el hero de la
 *    home: la banda va inmediatamente debajo, como su bajada. Así la identidad
 *    final se cambia editando este archivo y nada más, y si el evento se cae el
 *    hero no quedó tocado;
 *  - usa el wordmark OFICIAL (`/hype-wordmark.svg`). La palabra "HYPE" no se
 *    re-tipografía nunca; lo único que se compone tipográficamente es el "72";
 *  - no escribe ni un monto ni un porcentaje (ver el bloque de precios en
 *    `lib/hype72-home.ts`). Cuenta la mecánica y la fecha, que es lo único
 *    verificado.
 *
 * `--radius: 0`, sin emojis, sin rojo de oferta: el acento es
 * `--hype72-acento`.
 */

interface Props {
  state: Exclude<Hype72HomeState, 'normal'>;
  /** Instante al que apunta la cuenta, en ms. Lo resuelve el servidor. */
  target: number;
  /** Hora del servidor en el render, en ms. Evita el mismatch de hidratación. */
  ahora: number;
}

export default function Hype72Banda({ state, target, ahora }: Props) {
  const enCurso = state === 'evento';
  const [falta, setFalta] = useState(() => textoRestante(target, ahora));

  useEffect(() => {
    const tick = () => setFalta(textoRestante(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <section
      id="hype72"
      className="relative bg-[#0a0a0a] text-white scroll-mt-[var(--offset)]"
      aria-label="HYPE 72"
    >
      {/* Filo de acento arriba: la única pincelada de color del bloque. */}
      <div className="h-[3px] w-full" style={{ background: 'var(--hype72-acento)' }} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Mobile primero: una columna, todo apilado y centrado a la izquierda.
            En desktop pasa a dos columnas con el CTA a la derecha. */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">

          <div className="flex flex-col gap-3">
            {/* Lockup: wordmark oficial + el 72 compuesto. */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/hype-wordmark.svg"
                alt="HYPE"
                width={96}
                height={26}
                priority={false}
                className="h-[22px] md:h-[28px] w-auto object-contain invert"
              />
              <span
                className="font-black leading-none tracking-[-0.05em] text-[34px] md:text-[44px]"
                style={{ color: 'var(--hype72-acento)' }}
              >
                72
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] text-white/50">
                {enCurso ? `En curso · hasta el ${HYPE72_CIERRE_LABEL}` : HYPE72_FECHAS}
              </p>
              {/* El beneficio principal, por MECÁNICA. Sin cifras: los montos
                  no están aprobados y el precio final lo dice cada ficha. */}
              <p className="text-[19px] md:text-[26px] font-semibold leading-tight tracking-[-0.02em] max-w-[22ch] md:max-w-none">
                Seis drops en 72 horas, con regalo por compra.
              </p>
              <p className="text-[12px] md:text-[13px] text-white/55 max-w-[38ch]">
                {enCurso
                  ? 'Lo que abrió queda abierto hasta que cierren las 72 horas.'
                  : 'Un drop nuevo cada mañana y cada noche.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            {falta && (
              <div className="flex flex-col gap-1 md:items-end">
                <span className="text-[9px] uppercase tracking-[0.22em] text-white/35">
                  {enCurso ? 'Termina en' : 'Arranca en'}
                </span>
                <span
                  className="text-[26px] md:text-[34px] font-semibold tabular-nums leading-none tracking-[-0.02em]"
                  style={{ color: 'var(--hype72-acento)' }}
                >
                  {falta}
                </span>
              </div>
            )}
            <Link
              href={enCurso ? HYPE72_CTA_EVENTO : HYPE72_LANDING}
              className="inline-flex items-center gap-2 bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/85"
            >
              {enCurso ? 'Ver las ofertas' : 'Ver el catálogo'}
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
