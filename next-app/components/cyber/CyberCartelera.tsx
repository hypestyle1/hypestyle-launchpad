import Link from 'next/link';
import type { CyberCarteleraItem } from '@/lib/cyber-cartelera';
import { cyberPriceLine } from '@/lib/cyber-cartelera';

/**
 * La cartelera editorial de lanzamientos de CYBER HYPE — la parte visual
 * recuperada del PR #623 (Hype72Board), rehecha con la identidad aprobada de
 * /cyberhype: negro, filetes blancos al 12%, labels mono en tracking ancho y
 * el número grande como pieza tipográfica. Sin naranja, sin tarjetas de
 * marketplace, sin contadores por fila.
 *
 * Es un componente de SERVIDOR: recibe los items ya resueltos (estado
 * calculado con la hora del server) y solo dibuja. No hay ningún dato acá.
 *
 * Estados:
 *  - abierto   → fila entera clickeable, chip "Disponible", flecha.
 *  - revelado  → se lee qué es, chip con el horario de apertura, sin link.
 *  - oculto    → "???": ni título ni claim (solo llega acá en demo local;
 *                en producción un lanzamiento no confirmado ni se publica).
 *  - cerrado   → fila apagada, "Terminó".
 */
export default function CyberCartelera({ items }: { items: CyberCarteleraItem[] }) {
  if (items.length === 0) return null;

  return (
    <ol className="border-t border-white/12">
      {items.map(({ lanzamiento: l, estado }) => {
        const abierto = estado === 'abierto';
        const oculto = estado === 'oculto';
        const cerrado = estado === 'cerrado';
        const precio = cyberPriceLine(l);

        const fila = (
          <div
            className={`grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 border-b border-white/12 py-5 sm:gap-x-8 sm:py-7 ${
              cerrado ? 'opacity-40' : ''
            } ${abierto ? 'transition-colors group-hover:bg-white/[0.04]' : ''}`}
          >
            {/* Número */}
            <span className="text-[13px] font-semibold tabular-nums tracking-[0.1em] text-white/35 sm:text-[15px]">
              {l.id}
            </span>

            {/* Qué es */}
            <span className="min-w-0">
              <span
                className={`block truncate text-[22px] font-extrabold uppercase leading-[1.05] tracking-[-0.01em] sm:text-[34px] ${
                  oculto ? 'text-white/30' : 'text-white'
                }`}
              >
                {oculto ? '???' : l.title}
              </span>
              {!oculto && (
                <span className="mt-1.5 block text-[12.5px] leading-snug text-white/55 sm:text-[14px]">
                  {l.claim}
                  {precio && <span className="text-white/80"> — {precio}</span>}
                </span>
              )}
            </span>

            {/* Estado */}
            <span className="justify-self-end text-right">
              {abierto && (
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                  Disponible
                  <span aria-hidden="true" className="hidden sm:inline">→</span>
                </span>
              )}
              {estado === 'revelado' && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Abre {l.slot}
                </span>
              )}
              {oculto && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Se revela {l.slot}
                </span>
              )}
              {cerrado && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Terminó
                </span>
              )}
            </span>
          </div>
        );

        return (
          <li key={l.id}>
            {abierto ? (
              <Link href={l.href} className="group block focus-visible:outline-white">
                {fila}
              </Link>
            ) : (
              fila
            )}
          </li>
        );
      })}
    </ol>
  );
}
