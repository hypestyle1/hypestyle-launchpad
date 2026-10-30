import Link from 'next/link';
import CyberWordmark from './CyberWordmark';
import CyberHeroFondo, { type CyberFondo } from './CyberHeroFondo';
import CyberHeroCountdown from './CyberHeroCountdown';
import './cyber.css';

/* Hero del takeover de CYBER HYPE.

   ── La composición (ref. del 29/10) ─────────────────────────────────────────
   Todo el contenido vive en la mitad inferior, apilado y alineado a la
   izquierda, con el countdown como cierre de ancho completo:
      fecha · wordmark · bajada · CTA · countdown
   Antes el bloque de texto peleaba a la izquierda contra un contador chico
   arrinconado a la derecha, y quedaba un hueco en el medio. Ahora la foto
   ocupa arriba, el texto baja en orden de lectura y el reloj apoya todo el
   ancho: la pantalla se lee de un saque.

   En DESKTOP no es el mobile estirado. El texto se limita a una columna de
   ~560 px sobre el costado izquierdo (donde la foto tiene su masa oscura) y
   el countdown queda acotado a esa columna, no cruzando la pantalla entera:
   un reloj de 1.400 px de ancho se lee como una barra de progreso, no como
   una cuenta regresiva. La foto es otra toma y otro recorte, elegidos para
   ese formato.

   ── El fondo ────────────────────────────────────────────────────────────────
   Lo resuelve CyberHeroFondo: foto de Lucas García (por defecto), el video
   del helicóptero o la editorial FW26, según lo que se elija. Cambiar de uno
   a otro no toca este archivo.

   Es un componente de SERVIDOR: el único estado es el reloj, que vive en
   CyberHeroCountdown. */

export default function CyberTakeoverHero({
  targetIso,
  ultimasHoras,
  fondo = 'foto',
  ctaHref,
  ctaLabel,
}: {
  /** El cierre del evento (lo resuelve el servidor con lib/cyber-hype). */
  targetIso: string;
  ultimasHoras: boolean;
  fondo?: CyberFondo;
  /** Adónde manda el botón principal y qué dice. */
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <section className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#0a0a0a] md:px-4 md:pb-4 md:pt-[calc(var(--offset)+6px)]">
      <div className="relative h-full w-full overflow-hidden rounded-none bg-[#141414] md:rounded-[24px]">
        <CyberHeroFondo fondo={fondo} />

        {/* Scrims: una base alta y densa para que todo el bloque inferior se
            lea sobre cualquier foto, y una franja arriba para el navbar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-black/95 via-black/72 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Masthead */}
        <div className="absolute inset-x-5 top-[calc(var(--offset)+10px)] flex items-center justify-between md:inset-x-10 md:top-7">
          <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] md:text-[10px]">
            HYPE® STYLE&CULTURE
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/[0.14] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-[24px] md:text-[10px]">
            <span className="cyber-live-dot h-1.5 w-1.5 rounded-full bg-white" />
            {ultimasHoras ? 'Últimas horas' : 'En vivo'}
          </span>
        </div>

        {/* Bloque inferior: fecha → wordmark → bajada → CTA → countdown */}
        <div className="absolute inset-x-5 bottom-6 md:inset-x-10 md:bottom-9">
          <div className="max-w-[560px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:text-[13px]">
              {ultimasHoras ? 'Termina hoy · 23:59' : '2 · 3 · 4 de noviembre'}
            </p>

            <h1 className="mt-2 text-[clamp(42px,12.5vw,54px)] leading-[0.86] [text-shadow:0_2px_24px_rgba(0,0,0,0.5)] md:mt-3 md:text-[clamp(64px,6vw,86px)]">
              <CyberWordmark animate tone="dark" />
            </h1>

            <p className="mt-3 max-w-[44ch] text-[14.5px] leading-[1.45] text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:mt-4 md:text-[16px]">
              Tres días. Un drop nuevo cada día, el 4 PACK de Regular Tees y el archivo abierto.
            </p>

            <Link
              href={ctaHref}
              className="mt-5 inline-flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-white px-8 text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a] transition-transform duration-300 hover:scale-[1.02] md:mt-6 md:h-[58px] md:w-auto md:px-10 md:text-[13px]"
            >
              {ctaLabel}
              <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true">
                <path
                  d="M9.6.7 13.9 5 9.6 9.3M13.3 5H.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <div className="mt-4 md:mt-5">
              <CyberHeroCountdown targetIso={targetIso} label="Termina en" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
