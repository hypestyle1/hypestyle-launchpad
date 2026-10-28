import Link from 'next/link';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CyberWordmark from '@/components/cyber/CyberWordmark';
import CyberCountdown from '@/components/cyber/CyberCountdown';
import CyberAvisame from '@/components/cyber/CyberAvisame';
import { buildMetadata } from '@/lib/seo';
import {
  CYBER_FECHAS,
  CYBER_HORA_APERTURA,
  cyberEstado,
  cyberProximoHito,
  cyberCapturaAbierta,
} from '@/lib/cyber-hype';

/**
 * Landing de previa de CYBER HYPE — la página de registro.
 *
 * Alcance aprobado el 27/10: identidad actual del ecommerce + wordmark CYBER,
 * fechas, formulario de email y nada más. **Sin cartelera de drops** (la
 * mecánica de 6 drops quedó sin efecto), **sin precios ni porcentajes**, **sin
 * acceso anticipado**, sin sorteo.
 *
 * `noindex`: la página no se indexa mientras es una previa, igual que el PR
 * original. No está linkeada desde el sitio todavía; el link se reparte por
 * historias, bio y mail. Que Google la ignore evita que aparezca en búsquedas
 * con las fechas viejas cuando el evento termine.
 *
 * Renderizado dinámico: el estado (previa / evento / cerrado) se calcula por
 * fecha en cada request, así la página no queda cacheada en "previa" después de
 * la apertura.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'CYBER HYPE',
  description: `Tres días, del ${CYBER_FECHAS}. Dejá tu mail y te avisamos cuando abre.`,
  path: '/hype72',
  noindex: true,
});

export default function Page() {
  const estado = cyberEstado();
  const hito = cyberProximoHito();
  const captura = cyberCapturaAbierta();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="px-4 md:px-6 pt-5 md:pt-8">
          <div className="rounded-[8px] bg-[#0a0a0a] px-5 py-10 md:px-12 md:py-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Hype® Style&amp;Culture
            </p>

            <h1 className="mt-5 text-[40px] leading-[0.95] sm:text-[58px] md:text-[86px]">
              <CyberWordmark animate priority />
            </h1>

            <p className="mt-6 max-w-[34ch] text-[16px] leading-relaxed text-white/70 md:text-[18px]">
              {estado === 'previa' && (
                <>Tres días: <span className="font-medium text-white">{CYBER_FECHAS}</span>. Abre el
                lunes a las {CYBER_HORA_APERTURA} y cierra el miércoles a las 23:59.</>
              )}
              {estado === 'evento' && (
                <><span className="font-medium text-white">Está abierto.</span> Hasta el miércoles 4
                de noviembre a las 23:59.</>
              )}
              {estado === 'cerrado' && (
                <>CYBER HYPE terminó. Gracias a todos los que compraron estos tres días.</>
              )}
            </p>

            {hito && (
              <div className="mt-9">
                <CyberCountdown targetIso={hito.iso} label={hito.label} />
              </div>
            )}

            {estado !== 'previa' && (
              <Link
                href="/"
                className="mt-9 inline-flex h-[52px] items-center rounded-[8px] bg-white px-8 text-[12px] font-bold uppercase tracking-[0.16em] text-[#0a0a0a] transition-opacity hover:opacity-85"
              >
                {estado === 'evento' ? 'Ver la tienda' : 'Ver lo que quedó'}
              </Link>
            )}
          </div>
        </section>

        {/* ── Registro ──────────────────────────────────────────────────────── */}
        <section id="avisame" className="px-4 md:px-6 pt-12 md:pt-16">
          <div className="md:grid md:grid-cols-[1fr_minmax(0,460px)] md:items-start md:gap-12">
            <div>
              <h2 className="text-[30px] font-semibold leading-[1.02] tracking-[-0.035em] md:text-[46px]">
                {captura ? 'Avisame cuando abra' : 'Ya está abierto'}
              </h2>
              <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
                {captura ? (
                  <>Dejá tu mail y te escribimos en el momento en que abre, el lunes a las{' '}
                  {CYBER_HORA_APERTURA}. Antes te mandamos los anticipos de lo que entra.</>
                ) : (
                  <>El aviso ya salió. Entrá a la tienda: lo del evento está arriba hasta el
                  miércoles a las 23:59.</>
                )}
              </p>
            </div>

            <div className="mt-7 md:mt-0">
              {captura ? (
                <CyberAvisame />
              ) : (
                <Link
                  href="/"
                  className="inline-flex h-[52px] items-center rounded-[8px] bg-foreground px-8 text-[12px] font-bold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-85"
                >
                  Ver la tienda
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Qué es ────────────────────────────────────────────────────────── */}
        <section className="px-4 md:px-6 pt-14 md:pt-20">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Qué es
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[8px] border border-border bg-border md:grid-cols-3">
            <Bloque
              titulo="Tres días"
              texto={`${CYBER_FECHAS} de 2026. Abre el lunes a las ${CYBER_HORA_APERTURA} y cierra el miércoles a las 23:59.`}
            />
            <Bloque
              titulo="Un evento nuestro"
              texto="No es Cyber Monday ni una fecha ajena: es la de Hype, con nuestras prendas y nuestras reglas."
            />
            <Bloque
              titulo="Igual para todos"
              texto="No hay acceso anticipado ni lista con prioridad. Abre a la misma hora para todo el mundo."
            />
          </div>
        </section>

        {/* ── Preguntas ─────────────────────────────────────────────────────── */}
        <section className="px-4 md:px-6 pt-14 md:pt-20 pb-20 md:pb-28">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Preguntas
          </h2>
          <div className="mt-5 max-w-[70ch] divide-y divide-border border-y border-border">
            <Pregunta q="¿Cuándo abre exactamente?">
              El lunes 2 de noviembre a las {CYBER_HORA_APERTURA} de Argentina, y cierra el miércoles
              4 a las 23:59.
            </Pregunta>
            <Pregunta q="¿Los que dejan el mail compran antes?">
              No. No hay acceso anticipado: abre al mismo tiempo para todos. Lo único que tiene el
              mail es el aviso en el momento de la apertura y los anticipos antes del feed.
            </Pregunta>
            <Pregunta q="¿Qué va a haber?">
              Lo vamos a ir contando por mail y por Instagram durante la semana. Mientras no esté
              confirmado prendas por prenda, preferimos no prometer nada.
            </Pregunta>
            <Pregunta q="¿Cuántos mails me van a llegar?">
              Los del evento y nada más: unos pocos esta semana y durante los tres días. Después, la
              newsletter normal de Hype, y te podés dar de baja desde cualquiera de ellos.
            </Pregunta>
            <Pregunta q="¿Puedo sacarme de la lista?">
              Sí, desde el link de baja que viene en todos los mails. También podés escribirnos por{' '}
              <a
                href="https://instagram.com/hypestylearg"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                @hypestylearg
              </a>
              .
            </Pregunta>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="bg-white px-5 py-6">
      <p className="text-[15px] font-semibold tracking-[-0.01em]">{titulo}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{texto}</p>
    </div>
  );
}

function Pregunta({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-medium leading-snug [&::-webkit-details-marker]:hidden">
        {q}
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[18px] leading-none text-muted-foreground transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-2.5 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
