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
import ShopTheLook from '@/components/ShopTheLook';
import CyberCanal from './CyberCanal';
import CyberNavCategorias from './CyberNavCategorias';
import CyberEditorial, { CYBER_CATEGORIAS_EDITORIAL } from './CyberEditorial';
import '@/components/cyber/cyber.css';
import { whatsappUrl } from '@/lib/cyber-whatsapp';
import { CYBER_END, CYBER_START, cyberAhora, cyberUltimasHoras } from '@/lib/cyber-hype';
import { cyberAuthenticated } from '@/lib/cyber-visibility-server';
import cyberPrices from '@/lib/cyber-price-preview.json';
import {
  CYBER_ACCESOS,
  CYBER_DESTACADOS_SLUGS,
  CYBER_FILTROS,
  CYBER_MYSTERY,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
  CYBER_DROPS,
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
  // cyberAhora(): con la fase forzada en local, los drops se ven como en la
  // apertura. En producción es el reloj real y no adelanta nada.
  const authenticated = await cyberAuthenticated();
  const pricePreview = authenticated && Date.now() < Date.parse(CYBER_START);
  const drops = dropsPublicos(cyberAhora()).map(d =>
    authenticated && d.id === '01'
      ? { ...d, estado: 'revelado' as const, producto: CYBER_DROPS[0].producto! }
      : d,
  );
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
          <CyberMysterySection categorias={CYBER_MYSTERY} />
        )}

        <CyberDrops drops={drops} />

        <CyberEditorial tarjetas={CYBER_CATEGORIAS_EDITORIAL} />

        <CyberCatalogoEvento destacadosSlugs={CYBER_DESTACADOS_SLUGS} filtros={CYBER_FILTROS} pricePreview={cyberPrices} preview={pricePreview} />

        {/* Shop the Look: el MISMO componente de la home, sin tocar. Va acá y
            no antes del catálogo a propósito — arriba le robaría atención a
            las ofertas, que es lo que el evento vino a mostrar. Después de ver
            precios, en cambio, la pregunta deja de ser "cuánto sale" y pasa a
            ser "con qué lo combino", que es donde sube el ticket. */}
        <div className="bg-white text-foreground">
          <ShopTheLook />
        </div>

        {/* El regalo, justo después del catálogo: es donde aparece la
            fricción real —"llevo $78.000, me faltan $22.000 para la cadena"—
            y donde un regalo deja de ser información para ser un motivo de
            sumar. Más arriba llegaba descolgado: pedía recordar tres montos
            antes de haber visto un solo precio. */}
        <CyberRegalos />

        {/* La franja de 'precios finales / transferencia / envíos' ya no está
            acá: esos tres datos ahora rotan en la announcement bar de arriba,
            que los muestra en todas las páginas del evento y no interrumpe la
            lectura entre el catálogo y las preguntas. Tenerlos en los dos
            lados era decir lo mismo dos veces, y en mobile la franja se
            cruzaba justo donde la persona viene bajando a comprar. */}

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
