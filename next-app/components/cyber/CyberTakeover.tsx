import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchAllProducts } from '@/lib/products-server';
import CyberAnnouncementBar from './CyberAnnouncementBar';
import CyberTakeoverHero from './CyberTakeoverHero';
import type { CyberFondo } from './CyberHeroFondo';
import CyberDrops from './CyberDrops';
import Cyber4Pack from './Cyber4Pack';
import CyberMysterySection from './CyberMysterySection';
import CyberCatalogoEvento from './CyberCatalogoEvento';
import CyberCondiciones from './CyberCondiciones';
import CyberWhatsApp from './CyberWhatsApp';
import '@/components/cyber/cyber.css';
import { whatsappUrl } from '@/lib/cyber-whatsapp';
import { CYBER_END, cyberUltimasHoras } from '@/lib/cyber-hype';
import {
  CYBER_DESTACADOS_SLUGS,
  CYBER_FILTROS,
  CYBER_MYSTERY,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
} from '@/lib/cyber-cartelera';

/* CYBER HYPE TAKEOVER — la experiencia completa del EVENTO (2–4/11).

   La renderiza la home (app/page.tsx) y /cyberhype SOLO mientras
   cyberEstado() === 'evento': antes y después, las dos páginas vuelven solas
   a lo de siempre — la restauración es no renderizar esto, no revertir nada.

   Orden comercial (jerarquía aprobada el 29/10, con lo urgente del día
   arriba): hero EN VIVO → beneficios → 3 drops → 4 PACK → Mystery Archive →
   catálogo completo → canal + footer. El navbar es el REAL del sitio
   (carrito, buscador y menú funcionando); solo la announcement bar cambia a
   la versión oscura del evento.

   Datos: el catálogo se precarga acá en el servidor y se hidrata (mismo
   patrón de la home SS27) — las grillas salen pintadas en el primer render.
   Los drops llegan ya saneados (dropsPublicos): nada secreto viaja al
   navegador. Mystery solo se monta en producción cuando MYSTERY_PUBLICADO
   sea true. */

export default async function CyberTakeover({ fondo }: { fondo?: CyberFondo } = {}) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['products'], queryFn: fetchAllProducts });

  const ultimasHoras = cyberUltimasHoras();
  const drops = dropsPublicos();
  const hayRevelado = drops.some((d) => d.estado === 'revelado');
  const mostrarMystery = MYSTERY_PUBLICADO || process.env.NODE_ENV !== 'production';
  const urlWhatsApp = whatsappUrl();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CyberAnnouncementBar ultimasHoras={ultimasHoras} />
      <Navbar />
      <main className="bg-[#0a0a0a]">
        <h1 className="sr-only">
          CYBER HYPE — el evento de HYPESTYLE del 2 al 4 de noviembre. Drops diarios, 4 PACK de
          Regular Tees y Mystery Archive.
        </h1>

        <CyberTakeoverHero targetIso={CYBER_END} ultimasHoras={ultimasHoras} fondo={fondo ?? 'foto'} />

        {/* Beneficios: solo mecánicas reales y vigentes, sin montos. */}
        <section className="bg-[#0a0a0a] px-4 pt-10 text-white md:px-10 md:pt-12">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
            {[
              { t: 'Precios finales', d: 'Lo que ves es lo que pagás. Sin letra chica.' },
              { t: 'Regalos por compra', d: 'Sumá regalos según tu carrito, como siempre en Hype.' },
              { t: 'Transferencia conviene', d: 'El descuento por transferencia aplica también en el evento.' },
              { t: 'Envíos a todo el país', d: 'Despacho con seguimiento Andreani, por orden de compra.' },
            ].map((b) => (
              <div key={b.t} className="rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-4 md:px-5 md:py-5">
                <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.06em] text-white md:text-[13px]">
                  {b.t}
                </p>
                <p className="text-[11px] leading-[1.5] text-white/50 md:text-[12px]">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* El orden depende de si hay algo revelado, y es una decisión de
            conversión, no de gusto: mientras los tres drops estén bloqueados,
            lo primero que se ve después del hero serían tres cajas con un
            signo de pregunta — nada para comprar. En ese caso manda el 4 PACK,
            que sí es comprable, y los drops quedan abajo como "lo que viene".
            Apenas se revela el primero, los drops suben: ahí son la novedad
            del día y lo que trae de vuelta a quien ya compró. */}
        {hayRevelado ? (
          <>
            <CyberDrops drops={drops} />
            <Cyber4Pack slugs={CYBER_PACK_SLUGS} />
          </>
        ) : (
          <>
            <Cyber4Pack slugs={CYBER_PACK_SLUGS} />
            <CyberDrops drops={drops} />
          </>
        )}

        {mostrarMystery && (
          <CyberMysterySection categorias={CYBER_MYSTERY} publicado={MYSTERY_PUBLICADO} />
        )}

        <CyberCatalogoEvento destacadosSlugs={CYBER_DESTACADOS_SLUGS} filtros={CYBER_FILTROS} />

        <CyberCondiciones />

        {/* Cierre: el canal, donde las revelaciones salen primero. */}
        <section className="bg-[#0a0a0a] px-4 pb-14 pt-12 text-white md:px-10 md:pb-16">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-5 rounded-[16px] border border-white/12 bg-white/[0.04] px-5 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">
            <div>
              <p className="text-[18px] font-black uppercase tracking-[-0.01em] md:text-[22px]">
                Los drops salen primero por el canal
              </p>
              <p className="mt-1 max-w-[460px] text-[12px] leading-[1.5] text-white/55 md:text-[13px]">
                Cada revelación del evento se avisa en el canal de WhatsApp antes que en el feed.
              </p>
            </div>
            {urlWhatsApp !== '' && (
              /* El bloque de WhatsApp es el MISMO de la landing y está pensado
                 sobre blanco: va en su tarjeta, como allá. */
              <div className="w-full rounded-[16px] bg-white p-4 text-foreground md:w-[340px] md:p-5">
                <CyberWhatsApp url={urlWhatsApp} />
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </HydrationBoundary>
  );
}
