import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import ShopTheLook from '@/components/ShopTheLook';
import VistoEn from '@/components/VistoEn';
import BestSellersShelf from '@/components/home/BestSellersShelf';
import CategoriasChips from '@/components/home/CategoriasChips';
import CategoriasEditorial from '@/components/home/CategoriasEditorial';
import MysteryHome from '@/components/home/MysteryHome';
import MasElegidosShelf from '@/components/home/MasElegidosShelf';
import CamoColeccionHome from '@/components/home/CamoColeccionHome';
import RegularTeesPack from '@/components/home/RegularTeesPack';
import EditorialBanner from '@/components/EditorialBanner';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import ReviewsHomeSection from '@/components/reviews/ReviewsHomeSection';
import InstagramFeed from '@/components/InstagramFeed';
import Footer from '@/components/Footer';
import HeroSs27 from '@/components/ss27-home/HeroSs27';
import CyberHomeBanner from '@/components/cyber/CyberHomeBanner';
import CyberTakeover from '@/components/cyber/CyberTakeover';
import type { CyberFondo } from '@/components/cyber/CyberHeroFondo';
import { cyberTakeoverVisible } from '@/lib/cyber-visibility-server';

/**
 * Qué fondo lleva el hero del evento.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EL VIDEO DICE "HASTA 70% DE DESCUENTO"                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  El clip completo lleva un cartel con esa frase. Publicarlo es           ║
 * ║  comprometer un 70% real, y para que la frase sea defendible hace falta  ║
 * ║  al menos un producto con 70% efectivo sobre un precio de referencia     ║
 * ║  que se haya transado (89 de 145 productos tienen `sale_price`           ║
 * ║  permanente: su `regular_price` no sirve como referencia).               ║
 * ║                                                                          ║
 * ║  Por eso el default NO es el video: es la fotografía de calle de Lucas  ║
 * ║  García, que no promete nada. El video queda en preview hasta que esa   ║
 * ║  selección esté validada; cuando lo esté, se cambia HERO_FONDO a        ║
 * ║  'boom-mono' (la recomendada) y no hace falta tocar nada más.           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * En local se comparan todas con `?hero=`: `lucas` (el default), `boom-mono`,
 * `boom-color`, `loop-mono`, `loop-color` y `foto` (la editorial FW26).
 */
const HERO_FONDO: CyberFondo = 'lucas';

const FONDOS: CyberFondo[] = ['boom-mono', 'boom-color', 'loop-mono', 'loop-color', 'lucas', 'foto'];

function fondoHero(q: string | undefined): CyberFondo {
  if (process.env.NODE_ENV === 'production') return HERO_FONDO;
  return FONDOS.includes(q as CyberFondo) ? (q as CyberFondo) : HERO_FONDO;
}
import Ss27Feed from '@/components/ss27-home/Ss27Feed';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchCatalogForSsr } from '@/lib/catalog';
import { fetchHomeReviews } from '@/lib/reviews/server';
import { loadSs27Page } from '@/lib/ss27-coleccion-server';
import { SS27_HOME_EXTRA_SLUGS } from '@/lib/ss27-home';
import type { NormalizedProduct } from '@/lib/products-normalize';
import type { Ss27Product } from '@/lib/ss27-coleccion';
import { buildMetadata } from '@/lib/seo';

// Heroes anteriores (Hero + EventCountdown + PinnedIntro, HeroLaNuestra,
// HeroHannaDrop, HeroLookbookFW26) siguen en el repo, sin usar, por si hay que
// volver. Desde el drop SS27 (11/10/2026) el hero es HeroSs27.

// rawTitle: el título de la home se define entero acá, sin el sufijo de marca
// que lleva el resto del sitio (quedaría "…| HYPESTYLE" duplicando "Hype").
export const metadata = buildMetadata({
  title: 'Hype | Streetwear Argentino',
  rawTitle: true,
  description: 'HYPESTYLE® — streetwear argentino desde 2018. Hoodies, remeras, pants y sets de drops limitados. Envíos a todo el mundo.',
  path: '/',
});

// Velocidad (9/11): la home se regenera cada 60 s (ISR) y se sirve desde la
// caché de Vercel, como las páginas de categoría. Antes era force-dynamic por
// el gate con cookie del Cyber: cada visita se armaba de cero (TTFB de hasta
// 3,2 s en frío). Pasado el evento, cyberTakeoverVisible() devuelve false sin
// leer cookies, así que no hace falta render dinámico. Si se vuelve a usar un
// gate con cookie, hay que volver a force-dynamic.
export const revalidate = 60;

/**
 * NewInFW26, BasicosSection, BackInStock y MasHypeSection comparten la query
 * ['products'] de React Query, que pedía /api/products desde el browser: las
 * cuatro secciones se renderizaban vacías y se llenaban recién al resolver el
 * fetch. El documento pasaba de ~3.900px a ~21.000px de golpe y todo lo que
 * estaba en pantalla saltaba — el CLS del home en mobile llegaba a 0,8.
 *
 * Acá se precarga esa misma query en el servidor y se hidrata el cache, así el
 * primer render ya sale con los productos y no hay salto. fetchAllProducts()
 * usa exactamente el mismo query GraphQL que /api/products (mismos campos,
 * mismo orden por DATE, mismo dedupe por id), así que el dato hidratado y el
 * que traería el browser son idénticos: no hay refetch que vuelva a mover nada.
 *
 * SS27 va aparte: sus productos salen de la colección (tag ss27-part-01) por
 * el mu-plugin, igual que /colecciones/ss27, y llegan por props. Antes de la
 * apertura la lista viene vacía y la sección no se muestra.
 */
export default async function Home({
  searchParams,
}: {
  searchParams?: { hero?: string };
}) {
  /* ── CYBER HYPE TAKEOVER ────────────────────────────────────────────────
     Durante el cierre lo ve quien entró con la clave; desde las 19:00 la
     fase normal toma el control. La visibilidad no adelanta precios ni drops.
     Todo lo demás de este archivo —la home SS27— queda EXACTAMENTE igual y
     vuelve solo al terminar: la restauración es que esta condición dé false,
     no un deploy ni un revert. Palancas: las fechas en lib/cyber-hype.ts y el
     kill switch CYBER_APAGADO=1 (apaga el takeover al instante). */
  if (await cyberTakeoverVisible()) return <CyberTakeover fondo={fondoHero(searchParams?.hero)} />;

  const queryClient = new QueryClient();
  // Las reseñas van por separado: no pasan por React Query, la sección las
  // recibe por props. Sin esto se montaba vacía y a los 6–9s insertaba ~715px
  // arriba de #new-in-fw26, que era lo último que quedaba del CLS del home.
  //
  // Catálogo (9/11, velocidad): sale de fetchCatalogForSsr, el mismo catálogo
  // compartido y cacheado que usan las páginas de categoría (lib/catalog). Se
  // espera directo, NO con prefetchQuery: prefetchQuery se traga el error y
  // con ISR eso guardaría una home vacía. Así, si WP falla en una regeneración,
  // Next descarta esa versión y sigue sirviendo la última buena; en el build
  // devuelve [] y la grilla la carga el cliente (no tira el deploy).
  const [catalog, reviews, ss27] = await Promise.all([
    fetchCatalogForSsr(),
    fetchHomeReviews(4),
    loadSs27Page(),
  ]);
  queryClient.setQueryData(['products'], catalog);

  // Lo que acompaña al drop sin ser de la colección (medias, gorra): sale del
  // catálogo que ya se precargó arriba. Ver SS27_HOME_EXTRA_SLUGS.
  const extras: Ss27Product[] = SS27_HOME_EXTRA_SLUGS
    .filter((slug) => !ss27.products.some((p) => p.slug === slug))
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter((p): p is NormalizedProduct => Boolean(p))
    .map((p) => ({ ...p, comingSoon: false }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        {/* El título del hero es texto decorativo, así que el H1 del documento va acá.
            Oculto a la vista (sr-only) pero presente en el DOM. */}
        <h1 className="sr-only">
          HYPESTYLE — Streetwear argentino. Drops limitados, envíos a todo el mundo.
        </h1>
        <HeroSs27 />
        {/* Previa de CYBER HYPE: la franja negra horizontal, debajo del hero y
            antes del feed. Devuelve null fuera de la ventana de captación, así
            que después del 2/11 la home vuelve sola a ser la de siempre.
            Ver components/cyber/CyberHomeBanner. */}
        <CyberHomeBanner />
        {/* Orden: el drop nuevo arriba (SS27 + sus looks), después FW26, best
            sellers, básicos, editorial y la prueba social al final. Promo y
            Flash Sale devuelven null sin campaña. */}
        <div className="relative z-10 bg-white">
          <Promo3x2Section />
          <FlashSaleSection />
          {/* Home post-Cyber (9/11, pedido de Valentín): la mayor cantidad de
              productos en el menor recorrido, sin repetir ninguno (la
              deduplicación vive en lib/home-curaduria). Orden: atajos por
              categoría → lo que más factura → New In Camo → SS27 → banners de
              categoría (los de la landing de Cyber) → pack de Regular (reemplaza
              a Esenciales, conserva id="basicos") → Mystery → Best sellers con
              FW26 primero (el estante FW26 sale) → prueba social. */}
          <CategoriasChips />
          <MasElegidosShelf />
          <CamoColeccionHome />
          <Ss27Feed products={ss27.state === 'open' ? [...ss27.products, ...extras] : []} />
          <CategoriasEditorial />
          {/* Visto en (17/10): artistas con Hype puesto. Sube arriba del pack
              Regular el 9/11 (pedido de Valentín): más protagonismo para la
              prueba social, antes de la promo. */}
          <VistoEn />
          <RegularTeesPack />
          <MysteryHome />
          <BestSellersShelf />
          <ShopTheLook />
          <EditorialBanner />
          <ReviewsHomeSection initial={reviews} />
          {/* Último bloque antes del footer, a propósito: Clarity muestra que casi
              nadie llega hasta acá, así que no compite con el producto arriba. */}
          <InstagramFeed />
        </div>
      </main>
      <Footer />
    </HydrationBoundary>
  );
}
