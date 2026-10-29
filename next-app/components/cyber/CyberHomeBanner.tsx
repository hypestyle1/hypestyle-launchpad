import Link from 'next/link';
import CyberWordmark from './CyberWordmark';
import CyberBannerVisible from './CyberBannerVisible';
import AnimatedCountdown from '@/components/ui/animated-countdown';
import {
  CYBER_END,
  CYBER_FECHAS,
  CYBER_START,
  cyberCapturaAbierta,
  cyberEstado,
  cyberProximoHito,
} from '@/lib/cyber-hype';

/**
 * Banner de la previa de CYBER HYPE en la home.
 *
 * Qué es y qué NO es. No es un takeover: no toca el hero, no reordena nada, no
 * muestra precios ni descuentos y no promete drops ni regalos — nada de eso
 * está confirmado. Es una franja que anuncia la fecha y manda a registrarse.
 *
 * ── La composición es la PRIMERA, recuperada ────────────────────────────────
 * El 28/10 se probaron dos variantes glass (tarjeta montada sobre el hero y
 * franja comprimida) y Valentín las descartó: la dirección aprobada es la
 * franja negra horizontal original debajo del hero — identidad a la izquierda,
 * acción a la derecha, un filete de eje en el medio — que además es la misma
 * gramática de la landing. Sobre esa base entran solo tres mejoras pedidas:
 *
 *  1. La textura editorial de wordmarks al 2%, la misma de /cyberhype, que de
 *     paso le da al vidrio del contador algo real que desenfocar.
 *  2. El countdown con tratamiento liquid glass (components/ui, el componente
 *     que pasó Valentín) en lugar del contador tipográfico plano.
 *  3. Menos aire: la primera versión medía 325 px de alto en desktop.
 *
 * El fondo es #0a0a0a SÓLIDO a propósito: las franjas del glitch del lockup se
 * pintan con ese mismo color opaco, así que sobre esta franja el efecto es
 * perfecto — sobre las versiones glass el truco se notaba.
 *
 * Cuándo se ve: SOLO en la previa. Lo decide el servidor con
 * `cyberCapturaAbierta()`, igual que la landing, así que el reloj del visitante
 * no adelanta nada; `CyberBannerVisible` agrega el corte del lado del cliente
 * por si el HTML quedó cacheado. Pasada la apertura devuelve `null` y la home
 * vuelve sola a ser la de siempre, sin que nadie tenga que sacar nada.
 *
 * La fecha NO se duplica: sale de CYBER_START en lib/cyber-hype.ts, el mismo
 * valor que usan la landing y el test que lo ata a la ventana del 4 PACK.
 */
export default function CyberHomeBanner() {
  const estado = cyberEstado();

  /* ── EVENTO: la franja cambia, no desaparece ──────────────────────────────
     Mientras el evento está en vivo la home sigue siendo la SS27 de siempre,
     pero el visitante que entra por acá tiene que encontrar el camino en un
     scroll: una franja compacta — mismo negro, mismo lockup — que dice que
     está abierto y manda a /cyberhype. `CyberBannerVisible` con el CIERRE la
     apaga del lado del cliente aunque el HTML haya quedado cacheado; pasado el
     4/11 23:59 el servidor devuelve null y la home vuelve sola a ser la de
     siempre. */
  if (estado === 'evento') {
    return (
      <CyberBannerVisible hastaIso={CYBER_END}>
        <section
          aria-labelledby="cyber-banner-titulo"
          className="cyber-fondo relative overflow-hidden bg-[#0a0a0a] text-white"
          style={{ ['--cyber-glitch-bg' as string]: '#0a0a0a' }}
        >
          <div className="relative mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-7 md:flex-row md:items-center md:justify-between md:gap-10 md:px-6">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                En vivo · hasta el mié 4/11, 23:59
              </p>
              <h2 id="cyber-banner-titulo" className="mt-2.5 leading-none">
                <span className="sr-only">CYBER HYPE — en vivo, {CYBER_FECHAS}</span>
                <span aria-hidden="true">
                  <CyberWordmark
                    animate
                    tone="dark"
                    className="text-[34px] min-[400px]:text-[40px] sm:text-[46px] lg:text-[52px]"
                  />
                </span>
              </h2>
            </div>

            <Link
              href="/cyberhype"
              className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-white px-7 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white/88 md:w-auto md:shrink-0"
            >
              Ver el evento
              <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true">
                <path d="M9.6.7 13.9 5 9.6 9.3M13.3 5H.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>
      </CyberBannerVisible>
    );
  }

  /* ── PREVIA (la franja aprobada, sin cambios) / CIERRE (nada) ─────────── */
  if (!cyberCapturaAbierta()) return null;
  const hito = cyberProximoHito();
  if (!hito) return null;

  return (
    <CyberBannerVisible hastaIso={CYBER_START}>
      <section
        aria-labelledby="cyber-banner-titulo"
        className="cyber-fondo relative overflow-hidden bg-[#0a0a0a] text-white"
        style={{ ['--cyber-glitch-bg' as string]: '#0a0a0a' }}
      >
        <div className="relative mx-auto flex max-w-[1400px] flex-col gap-7 px-4 py-9 md:flex-row md:items-center md:justify-between md:gap-10 md:px-6 md:py-10">
          {/* ── Identidad ────────────────────────────────────────────────── */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Hype® Style&amp;Culture
            </p>

            <h2 id="cyber-banner-titulo" className="mt-3 leading-none">
              <span className="sr-only">CYBER HYPE — {CYBER_FECHAS}</span>
              <span aria-hidden="true">
                <CyberWordmark
                  animate
                  tone="dark"
                  className="text-[38px] min-[400px]:text-[44px] sm:text-[54px] lg:text-[62px]"
                />
              </span>
            </h2>

            <p className="mt-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              2 · 3 · 4 de noviembre
            </p>
            <p className="mt-2.5 max-w-[34ch] text-[14px] leading-[1.5] text-white/55">
              Tres días. Dejá tu mail y te avisamos apenas abra.
            </p>
          </div>

          {/* ── Eje ──────────────────────────────────────────────────────
              En mobile corta la franja en dos mitades; en desktop se para y
              separa identidad de acción. */}
          <div className="h-px w-full bg-white/12 md:h-24 md:w-px md:shrink-0" aria-hidden="true" />

          {/* ── Cuenta regresiva + CTA ───────────────────────────────────── */}
          <div className="md:shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
              {hito.label}
            </p>
            <AnimatedCountdown
              targetDate={hito.iso}
              variant="modern"
              size="sm"
              ariaLabel={`${hito.label}: cuenta regresiva a la apertura`}
              containerClassName="mt-3 w-full border-0 bg-transparent p-0 shadow-none backdrop-blur-0 md:w-auto"
              unitClassName="min-w-0 w-full sm:min-w-[4.6rem] md:min-w-[5rem] px-2.5 py-3 sm:px-3.5"
              numberClassName="text-[26px] sm:text-[30px]"
              labelClassName="mt-1.5 text-[8px] sm:text-[9px] tracking-[0.2em]"
            />

            <Link
              href="/cyberhype"
              className="mt-6 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-white px-7 text-[12px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white/88 md:mt-7 md:w-full"
            >
              Recibir aviso
              <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden="true">
                <path d="M9.6.7 13.9 5 9.6 9.3M13.3 5H.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </CyberBannerVisible>
  );
}
