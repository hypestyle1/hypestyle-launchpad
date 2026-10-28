import Link from 'next/link';
import Navbar from '@/components/Navbar';
import CyberWordmark from '@/components/cyber/CyberWordmark';
import CyberCountdown from '@/components/cyber/CyberCountdown';
import CyberAvisame from '@/components/cyber/CyberAvisame';
import CyberWhatsApp from '@/components/cyber/CyberWhatsApp';
import '@/components/cyber/cyber.css';
import { buildMetadata } from '@/lib/seo';
import { CYBER_WHATSAPP_URL, whatsappDisponible } from '@/lib/cyber-whatsapp';
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
 * Una sola pantalla, fondo negro, el lockup con glitch continuo a la izquierda
 * y una única tarjeta blanca a la derecha con las dos formas de anotarse. Nada
 * más: la versión del 27/10 tenía tres tarjetas de "qué es", cinco preguntas
 * frecuentes y el footer completo del sitio, y en desktop el formulario caía
 * fuera del primer viewport.
 *
 * El criterio es que en cinco segundos se entienda qué se prepara, cuándo
 * empieza y dónde dejar el mail.
 *
 * Dos cosas que se pueden alternar por query mientras se decide:
 *   `?fondo=liso` — negro plano, sin la textura de wordmarks.
 *   `?wa=demo`    — dibuja el bloque de WhatsApp sin enlace, solo para ver la
 *                   composición. Se ignora apenas haya invitación cargada.
 *
 * `noindex`: no se indexa mientras es una previa, y no está linkeada desde el
 * sitio. El link se reparte por historias, bio, mail y pauta.
 *
 * Renderizado dinámico: el estado (previa / evento / cerrado) se calcula por
 * fecha en cada request, así la página no queda cacheada en "previa" después
 * de la apertura.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'CYBER HYPE',
  description: `Tres días, del ${CYBER_FECHAS}. Dejá tu mail y te avisamos cuando abre.`,
  path: '/hype72',
  noindex: true,
});

export default function Page({ searchParams }: { searchParams?: { fondo?: string; wa?: string } }) {
  const estado = cyberEstado();
  const hito = cyberProximoHito();
  const captura = cyberCapturaAbierta();
  const conTextura = searchParams?.fondo !== 'liso';

  const hayWhatsApp = whatsappDisponible();
  // El demo es solo para mirar la composición en local. Dos candados: no
  // existe si ya hay invitación cargada, y no existe en producción. Así no hay
  // forma de que el sitio publicado muestre un botón que no lleva a ningún
  // lado, ni con la query puesta a mano.
  const demoWhatsApp =
    !hayWhatsApp && searchParams?.wa === 'demo' && process.env.NODE_ENV !== 'production';
  const mostrarWhatsApp = captura && (hayWhatsApp || demoWhatsApp);

  return (
    <>
      <Navbar />
      <main
        className={`flex min-h-[100svh] flex-col bg-[#0a0a0a] pt-[var(--offset)] text-white ${conTextura ? 'cyber-fondo' : ''}`}
        style={{ ['--cyber-glitch-bg' as string]: '#0a0a0a' }}
      >
        <section className="flex flex-1 items-center px-5 py-10 sm:px-8 md:py-14">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-9 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16">

            {/* ── Identidad ──────────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Hype® Style&amp;Culture
              </p>

              <h1 className="mt-4 leading-none">
                <CyberWordmark
                  animate
                  tone="dark"
                  className="text-[44px] min-[400px]:text-[50px] sm:text-[66px] lg:text-[76px] xl:text-[92px]"
                />
              </h1>

              <p className="mt-5 text-[15px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[17px]">
                2 · 3 · 4 de noviembre
              </p>

              <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
                {captura
                  ? 'Tres días. Anotate y te avisamos apenas abra: los adelantos salen por ahí antes que por el feed.'
                  : estado === 'evento'
                    ? 'Está abierto. Entrá a la tienda: lo del evento está arriba hasta el miércoles a las 23:59.'
                    : 'CYBER HYPE terminó. Gracias a todos los que compraron estos tres días.'}
              </p>

              {/* El reloj solo durante el evento, donde dice algo que el texto
                  no dice: lo que falta para que cierre. En la previa la fecha
                  ya está arriba y repetirla en dígitos grandes era ruido. */}
              {estado === 'evento' && hito && (
                <div className="mt-7">
                  <CyberCountdown targetIso={hito.iso} label={hito.label} />
                </div>
              )}
            </div>

            {/* ── Una sola tarjeta, las dos formas de anotarse ────────────── */}
            <div className="rounded-[16px] bg-white p-5 text-foreground sm:p-6">
              {captura ? (
                <>
                  {mostrarWhatsApp && (
                    <>
                      <CyberWhatsApp url={CYBER_WHATSAPP_URL || undefined} demo={demoWhatsApp} />

                      {/* Separador: las dos vías son alternativas, no pasos. */}
                      <div className="my-5 flex items-center gap-3" aria-hidden="true">
                        <span className="h-px flex-1 bg-foreground/12" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-light">o</span>
                        <span className="h-px flex-1 bg-foreground/12" />
                      </div>

                      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground">
                        Recibir el aviso por email
                      </p>
                    </>
                  )}

                  <CyberAvisame />

                  <p className="mt-4 border-t border-foreground/10 pt-3.5 text-[11.5px] leading-[1.5] text-text-light">
                    Abre el lunes 2/11 a las {CYBER_HORA_APERTURA}. Igual para todos: el aviso sale a
                    la misma hora para toda la lista.
                  </p>
                </>
              ) : (
                <Link
                  href="/"
                  className="flex h-[54px] w-full items-center justify-center rounded-[10px] bg-foreground px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-85"
                >
                  {estado === 'evento' ? 'Ver la tienda' : 'Ver lo que quedó'}
                </Link>
              )}
            </div>

          </div>
        </section>

        {/* ── Pie mínimo ────────────────────────────────────────────────────
            El footer del sitio son cuatro columnas de catálogo, ayuda, redes y
            newsletter: en una página de un solo campo pesa más que el
            contenido. Queda lo que no puede faltar. */}
        <footer className="px-5 pb-7 pt-8 text-[11px] text-white/35">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-white/60">
              Política de privacidad
            </Link>
            <Link href="/terminos-y-condiciones" className="underline underline-offset-2 hover:text-white/60">
              Términos
            </Link>
            <a
              href="https://instagram.com/hypestylearg"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white/60"
            >
              @hypestylearg
            </a>
            <span>© {new Date().getFullYear()} Hypestyle</span>
          </div>
        </footer>
      </main>
    </>
  );
}
