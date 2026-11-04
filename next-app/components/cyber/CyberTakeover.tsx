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
import VistoEn from '@/components/VistoEn';
import CyberCanal from './CyberCanal';
import CyberEditorial, { CYBER_CATEGORIAS_EDITORIAL } from './CyberEditorial';
import '@/components/cyber/cyber.css';
import { whatsappUrl } from '@/lib/cyber-whatsapp';
import { CYBER_END, CYBER_START, cyberAhora, cyberUltimasHoras } from '@/lib/cyber-hype';
import { cyberAuthenticated } from '@/lib/cyber-visibility-server';
import cyberPrices from '@/lib/cyber-price-preview.json';
import {
  CYBER_DESTACADOS_SLUGS,
  CYBER_FILTROS,
  CYBER_MYSTERY,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
  piezaPublica,
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
      ? {
          ...d,
          estado: 'revelado' as const,
          producto: {
            ...CYBER_DROPS[0].producto!,
            piezas: CYBER_DROPS[0].producto!.piezas?.map(piezaPublica),
          },
        }
      : d,
  );
  const mostrarMystery = MYSTERY_PUBLICADO || process.env.NODE_ENV !== 'production';
  const urlWhatsApp = whatsappUrl();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CyberAnnouncementBar ultimasHoras={ultimasHoras} />
      <Navbar />
      <main className="bg-[#0a0a0a]">
        <h1 className="sr-only">
          CYBER HYPE — el evento de HYPESTYLE del 2 al 8 de noviembre. Drops, 4 PACK de
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
          ctaHref="#catalogo"
          ctaLabel="Ver las ofertas"
        />

        {/* Compra primero: el catálogo es el primer bloque después del hero,
            con los best sellers REALES arriba; Mystery son tres productos
            más, en la misma página blanca. Las categorías son una pieza
            editorial a sangre. Después el relato del evento (drops + preventa
            camo), el 4 PACK, y el refuerzo editorial que ya existía en la
            home (Shop the Look + Visto En) ANTES de regalos y condiciones:
            suma prueba social sin interrumpir el camino de compra.
            Ninguna de estas decisiones toca checkout, precios ni descuentos. */}
        <CyberCatalogoEvento
          destacadosSlugs={CYBER_DESTACADOS_SLUGS}
          filtros={CYBER_FILTROS}
          pricePreview={cyberPrices}
          preview={pricePreview}
          serverTime={Date.now()}
        />

        {mostrarMystery && <CyberMysterySection categorias={CYBER_MYSTERY} />}

        <CyberEditorial tarjetas={CYBER_CATEGORIAS_EDITORIAL} />

        {/* Camo unificado (4/11): el drop del Día 2 ES la pieza de preventa —
            una sola sección editorial, sin banner duplicado. El CTA lo
            gobierna PREVENTA_ZIP_CAMO en lib/cyber-cartelera. */}
        <CyberDrops drops={drops} />

        <Cyber4Pack slugs={CYBER_PACK_SLUGS} />

        {/* Shop the Look y Visto En: los MISMOS componentes de la home, sin
            tocar. Van después del bloque comercial a propósito: acá la
            pregunta ya no es "cuánto sale" sino "cómo se usa" y "quién lo
            usa" — conjuntos comprables y artistas con Hype puesto. */}
        <div className="bg-white text-foreground">
          <ShopTheLook />
          <VistoEn />
        </div>

        <CyberRegalos />

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
