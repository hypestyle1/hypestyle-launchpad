import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hype72Board from '@/components/hype72/Hype72Board';
import Hype72Countdown from '@/components/hype72/Hype72Countdown';
import Hype72Avisame from '@/components/hype72/Hype72Avisame';
import { buildMetadata } from '@/lib/seo';
import {
  HYPE72_DATES,
  HYPE72_END_LABEL,
  HYPE72_GIFTS,
  HYPE72_GIFT_FROM,
  hype72Board,
  isHype72Live,
  isHype72Over,
  nextMilestone,
} from '@/lib/hype72';

/**
 * HYPE 72 — landing del evento propio de Hype (2 al 4 de noviembre de 2026).
 *
 * Versión mínima y confiable: sin stock en vivo, sin backend propio. Todo el
 * contenido sale de lib/hype72.ts y el estado de cada drop lo decide el
 * SERVIDOR con esas fechas (ancladas a -03:00, America/Argentina/Buenos_Aires).
 * El único client component es la cuenta regresiva, que recibe el hito ya
 * elegido por el servidor y solo dibuja el tiempo que falta.
 *
 * En este PR la página NO se linkea desde el menú, la home ni el sitemap: se
 * comparte por URL hasta el lanzamiento.
 *
 * NO es CyberMonday ni CACE. No va "Cyber Monday" ni el logo de CACE en ningún
 * texto ni en ninguna pieza de esta página.
 */

const PATH = '/hype72';

export const metadata = buildMetadata({
  title: 'HYPE 72',
  rawTitle: true,
  description:
    '72 horas, 6 drops. Del 2 al 4 de noviembre, un drop nuevo cada mañana y cada noche. Regalo desde $100.000.',
  path: PATH,
  // Hasta el lanzamiento la página se comparte por URL y no está linkeada:
  // tampoco va al sitemap (ver STATIC_ROUTES en app/sitemap.ts y la lista
  // FUERA_DEL_SITEMAP del test). `follow` para que Google sí siga los links a
  // los productos. Al lanzar el evento: sacar el noindex y sumarla al sitemap.
  noindex: true,
  follow: true,
});

/**
 * Sin caché: el estado de la cartelera cambia con la hora y una versión
 * cacheada puede mostrar "???" después de la revelación (o al revés). Son 13
 * cambios de estado en una semana, no vale la pena cachear 60 s y arriesgar
 * que alguien refresque justo y vea lo de antes.
 */
export const dynamic = 'force-dynamic';

export default function Hype72Page() {
  const now = new Date();
  const board = hype72Board(now);
  const milestone = nextMilestone(now);
  const live = isHype72Live(now);
  const over = isHype72Over(now);

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        {/* El pb de mobile deja libre la franja de abajo: ahí flotan la pastilla
            de reseñas, el WhatsApp y el reproductor, y taparían los botones. */}
        <section className="flex min-h-[calc(100svh-var(--offset))] flex-col justify-between bg-[#0a0a0a] px-4 pb-[176px] pt-8 text-white md:px-10 md:pb-16 md:pt-14">
          <div>
            {/* El logo es el asset oficial que usa el navbar, invertido para
                fondo negro (mismo recurso que el menú mobile). No se
                re-tipografía "Hype" en ningún lado: el "72" es lo único que
                se compone con la tipografía del sitio. */}
            <h1>
              <span className="sr-only">HYPE 72 — 72 horas, 6 drops</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-hypestyle-nav.png" alt="" className="h-[19px] w-auto invert md:h-[24px]" />
              <span
                aria-hidden
                className="mt-1 block text-[104px] font-black leading-[0.76] tracking-[-0.06em] md:text-[180px]"
              >
                72
              </span>
            </h1>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
              {HYPE72_DATES}
              {live && <span className="ml-3 text-white">· En curso</span>}
            </p>

            {/* Los cortes de línea son parte del titular, no del ancho de la
                pantalla: por eso van en bloques y no librados al wrap. */}
            <p className="mt-6 text-[23px] font-bold uppercase leading-[1.06] tracking-[-0.03em] md:text-[40px]">
              {over ? (
                <span className="block">Las 72 horas terminaron</span>
              ) : (
                <>
                  <span className="block">72 horas.</span>
                  <span className="block">6 drops.</span>
                  <span className="block">Estuviste o no estuviste.</span>
                </>
              )}
            </p>

            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-white/60 md:text-[16px]">
              {over
                ? `Los 6 drops cerraron el ${HYPE72_END_LABEL}. Lo que sigue se cuenta por acá.`
                : `Un drop nuevo cada mañana y cada noche. Regalo desde ${HYPE72_GIFT_FROM}.`}
            </p>
          </div>

          <div className="mt-10">
            {milestone && (
              <Hype72Countdown targetIso={milestone.at} label={milestone.label} />
            )}

            <div className="mt-8 flex gap-3">
              <a
                href="#cartelera"
                className="flex-1 whitespace-nowrap bg-white px-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-black transition-opacity hover:opacity-80 sm:flex-none sm:px-9 sm:text-[12px] sm:tracking-[0.18em]"
              >
                Ver la cartelera
              </a>
              {!over && (
                <a
                  href="#avisame"
                  className="flex-1 whitespace-nowrap border border-white/30 px-4 py-4 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-white sm:flex-none sm:px-9 sm:text-[12px] sm:tracking-[0.18em]"
                >
                  Avisame
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Cartelera ────────────────────────────────────────────────────── */}
        <section id="cartelera" className="scroll-mt-[var(--offset)] px-4 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
          <header className="mb-9 md:mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              Los 6 drops
            </p>
            <h2 className="mt-2.5 text-[34px] font-bold uppercase leading-[1.02] tracking-[-0.035em] md:text-[56px]">
              La cartelera
            </h2>
            <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed text-black/60">
              Se revela un drop por día. Cada uno abre en su horario y queda abierto
              hasta el {HYPE72_END_LABEL}.
            </p>
          </header>

          <Hype72Board items={board} />
        </section>

        {/* ── Escalera de regalos ──────────────────────────────────────────── */}
        <section id="regalos" className="scroll-mt-[var(--offset)] bg-bg-alt px-4 py-14 md:px-10 md:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
            Las 72 horas
          </p>
          <h2 className="mt-2.5 text-[30px] font-bold uppercase leading-[1.04] tracking-[-0.03em] md:text-[48px]">
            Regalo desde {HYPE72_GIFT_FROM}
          </h2>

          <ol className="mt-8 max-w-[560px] border-t border-black/10">
            {HYPE72_GIFTS.map((g) => (
              <li
                key={g.value}
                className="flex items-baseline justify-between gap-4 border-b border-black/10 py-5"
              >
                <span className="text-[26px] font-black tabular-nums leading-none tracking-[-0.03em] md:text-[32px]">
                  {g.amount}
                </span>
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-black/65 md:text-[13px]">
                  {g.gift}
                </span>
              </li>
            ))}
          </ol>

          {/* Sin promesas de más: cómo se acumulan los regalos entre sí lo
              define el Purchase Gift del backend y todavía hay que verificarlo
              (ver el bloque PENDIENTE en lib/hype72.ts). Acá se dice lo único
              que es seguro. */}
          <p className="mt-5 max-w-[42ch] text-[13px] leading-relaxed text-black/55">
            El regalo se suma a tu pedido al llegar al monto.
          </p>
        </section>

        {/* ── Avisame ──────────────────────────────────────────────────────── */}
        <section
          id="avisame"
          className="scroll-mt-[var(--offset)] bg-[#0a0a0a] px-4 py-14 text-white md:px-10 md:py-20"
        >
          <h2 className="text-[30px] font-bold uppercase leading-[1.04] tracking-[-0.03em] md:text-[48px]">
            Avisame
          </h2>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-white/60 md:text-[16px]">
            Dejá tu email y te llega cada revelación y el aviso cuando abre el drop.
          </p>

          <div className="mt-8 max-w-[520px]">
            <Hype72Avisame />
            <p className="mt-4 text-[11px] leading-relaxed text-white/40">
              Al dejar tu email entrás a la lista de Hype. Podés darte de baja cuando quieras.
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
