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
import CyberRegalos from './CyberRegalos';
import CyberCanal from './CyberCanal';
import CyberNavCategorias from './CyberNavCategorias';
import CyberEditorial, { CYBER_CATEGORIAS_EDITORIAL } from './CyberEditorial';
import '@/components/cyber/cyber.css';
import { whatsappUrl } from '@/lib/cyber-whatsapp';
import { CYBER_END, cyberUltimasHoras } from '@/lib/cyber-hype';
import {
  CYBER_ACCESOS,
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

        {/* El CTA manda a lo primero comprable de verdad. Mientras los drops
            estén sin revelar eso es el 4 PACK; apenas se revela uno, los
            drops pasan a ser la novedad y el botón los sigue. Nunca apunta a
            la misma página sin destino: son anclas a secciones con producto. */}
        <CyberTakeoverHero
          targetIso={CYBER_END}
          ultimasHoras={ultimasHoras}
          fondo={fondo ?? 'lucas'}
          ctaHref={hayRevelado ? '#drops' : '#pack'}
          ctaLabel={hayRevelado ? 'Ver las ofertas' : 'Explorar Cyber Hype'}
        />

        {/* El recorrido (reordenado el 29/10). Antes los drops, los cuatro
            beneficios, los regalos y Mystery caían uno detrás de otro y se
            leían como un solo bloque amontonado. Ahora cada cosa tiene su
            lugar y hay cambios de ritmo entre medio: negro, foto, grilla
            clara, negro.

            1. 4 PACK — el producto estrella, lo primero comprable.
            2. MYSTERY ARCHIVE — las tres cajas, el otro protagonista.
            3. 3 DÍAS · 3 DROPS — sección propia, con aire alrededor.
            4. Navegación editorial + catálogo — explorar y comprar.
            5. REGALO POR COMPRA — justo después del catálogo, que es donde
               sube el ticket: ya eligió, ahora le falta poco para el regalo.
            6. Condiciones, canal y footer — al final, sin fricción. */}

        {/* Lo primero despues del hero: que hay y como llegar. Quien viene
            de un anuncio elige categoria antes de leer una linea sobre la
            mecanica del evento. */}
        <CyberNavCategorias accesos={CYBER_ACCESOS} />

        <Cyber4Pack slugs={CYBER_PACK_SLUGS} />

        {mostrarMystery && (
          <CyberMysterySection categorias={CYBER_MYSTERY} publicado={MYSTERY_PUBLICADO} />
        )}

        <CyberRegalos />

        <CyberDrops drops={drops} />

        <CyberEditorial tarjetas={CYBER_CATEGORIAS_EDITORIAL} />

        <CyberCatalogoEvento destacadosSlugs={CYBER_DESTACADOS_SLUGS} filtros={CYBER_FILTROS} />

        {/* La franja informativa: tres datos, una línea, sin competir con el
            producto. El regalo salió de acá — ya tiene su sección entera, y
            repetirlo era ocupar lugar comercial para decir lo mismo. */}
        <section className="bg-[#0a0a0a] px-4 pt-2 text-white md:px-10">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-x-8 gap-y-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            {[
              { t: 'Precios finales', d: 'Lo que ves es lo que pagás.' },
              { t: 'Transferencia conviene', d: 'Su descuento aplica también en el evento.' },
              { t: 'Envíos a todo el país', d: 'Andreani, con seguimiento por mail.' },
            ].map((b) => (
              <div key={b.t} className="flex items-baseline gap-2.5">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-white">
                  {b.t}
                </span>
                <span className="text-[11.5px] leading-[1.45] text-white/45">{b.d}</span>
              </div>
            ))}
          </div>
        </section>

        <CyberCondiciones />

      </main>

      {/* El canal, como banda clara: corta el negro del evento y separa la
          experiencia del footer habitual. Fuera de <main> a propósito: es el
          cierre de la página, no una sección más del evento. */}
      <CyberCanal url={urlWhatsApp} />
      <Footer />
    </HydrationBoundary>
  );
}
