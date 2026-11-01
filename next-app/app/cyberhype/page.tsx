import Link from 'next/link';
import Navbar from '@/components/Navbar';
import CyberWordmark from '@/components/cyber/CyberWordmark';
import CyberAvisame from '@/components/cyber/CyberAvisame';
import CyberWhatsApp from '@/components/cyber/CyberWhatsApp';
import CyberTakeover from '@/components/cyber/CyberTakeover';
import '@/components/cyber/cyber.css';
import { buildMetadata } from '@/lib/seo';
import { whatsappUrl } from '@/lib/cyber-whatsapp';
import {
  CYBER_FECHAS,
  CYBER_HORA_APERTURA,
  cyberEstado,
  cyberCapturaAbierta,
} from '@/lib/cyber-hype';
import { cyberTakeoverVisible } from '@/lib/cyber-visibility-server';

/**
 * CYBER HYPE — una sola página para las tres etapas del evento.
 *
 * PREVIA (hasta el 1/11 20:00): la página de registro aprobada el 28/10, sin
 * ningún cambio — fondo negro, lockup con glitch continuo, una tarjeta blanca
 * con WhatsApp y email, consentimiento a la vista. No adelanta nada comercial.
 *
 * EVENTO (1/11 20:00 → 4/11 23:59): el centro de campaña es la MISMA
 * experiencia que toma la home (components/cyber/CyberTakeover): hero EN
 * VIVO, 3 drops, 4 PACK, Mystery Archive y el catálogo real. Un solo
 * componente para las dos superficies — cero duplicación.
 *
 * POSTERIOR: cierre limpio — sin contadores vencidos ni promesas activas; un
 * solo camino a la tienda.
 *
 * Qué se puede alternar por query mientras se decide (solo previa):
 *   `?fondo=liso` — negro plano, sin la textura de wordmarks.
 *   `?wa=demo`    — dibuja el bloque de WhatsApp sin enlace (nunca en prod).
 * Y para la revisión en local (NUNCA en producción):
 *   `NEXT_PUBLIC_CYBER_FASE` — fuerza la fase (previa|evento|cerrado).
 *   `?demo=1`     — la cartelera suma los lanzamientos tentativos, para ver
 *                   los estados bloqueados. En prod un tentativo no existe.
 *
 * `noindex`: página de campaña, se reparte por historias, bio, mail y pauta.
 *
 * Renderizado dinámico: el estado se calcula por fecha en cada request, así la
 * página no queda cacheada en "previa" después de la apertura.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'CYBER HYPE',
  description: `Tres días, del ${CYBER_FECHAS}. Dejá tu mail y te avisamos cuando abre.`,
  path: '/cyberhype',
  noindex: true,
});

/** El pie que comparten las tres etapas: lo que no puede faltar y nada más. */
function PieMinimo() {
  return (
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
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { fondo?: string; wa?: string };
}) {
  const estado = cyberEstado();
  const captura = cyberCapturaAbierta();
  const conTextura = searchParams?.fondo !== 'liso';

  /* ── EVENTO: el mismo takeover que la home ───────────────────────────── */
  if (await cyberTakeoverVisible()) return <CyberTakeover />;


  /* ── PREVIA y CIERRE (la pantalla aprobada el 28/10, sin cambios) ────── */
  const urlWhatsApp = whatsappUrl();
  const hayWhatsApp = urlWhatsApp !== '';
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
                  : 'CYBER HYPE terminó. Gracias a todos los que compraron estos tres días.'}
              </p>
            </div>

            {/* ── Una sola tarjeta, las dos formas de anotarse ────────────── */}
            <div className="rounded-[16px] bg-white p-5 text-foreground sm:p-6">
              {captura ? (
                <>
                  {mostrarWhatsApp && (
                    <>
                      <CyberWhatsApp url={urlWhatsApp || undefined} demo={demoWhatsApp} />

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
                    Abre el domingo 1/11 a las {CYBER_HORA_APERTURA}. Igual para todos: el aviso sale a
                    la misma hora para toda la lista.
                  </p>
                </>
              ) : (
                <Link
                  href="/"
                  className="flex h-[54px] w-full items-center justify-center rounded-[10px] bg-foreground px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-85"
                >
                  Ver lo que quedó
                </Link>
              )}
            </div>

          </div>
        </section>

        <PieMinimo />
      </main>
    </>
  );
}
