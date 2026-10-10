import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import BasicosSection from '@/components/BasicosSection';
import MasHypeSection from '@/components/MasHypeSection';
import NewInFW26 from '@/components/NewInFW26';
import EditorialBanner from '@/components/EditorialBanner';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import VideoSection from '@/components/VideoSection';
import ReviewsHomeSection from '@/components/reviews/ReviewsHomeSection';
import InstagramFeed from '@/components/InstagramFeed';
import Footer from '@/components/Footer';
import HeroSs27 from '@/components/ss27-home/HeroSs27';
import Ss27Feed, { type FeedVariant } from '@/components/ss27-home/Ss27Feed';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchAllProducts } from '@/lib/products-server';
import { fetchHomeReviews } from '@/lib/reviews/server';
import { loadSs27Page } from '@/lib/ss27-coleccion-server';
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

// Selector de variantes para iterar el diseño en local (?v=). Solo en
// `next dev`: en cualquier build se usan las por defecto.
const FEEDS: FeedVariant[] = ['grilla', 'capitulos', 'split'];

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
export default async function Home({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sp = process.env.NODE_ENV === 'development' ? searchParams : {};
  const feedVariant = FEEDS.find((f) => f === sp.v) ?? 'grilla';

  const queryClient = new QueryClient();
  // Las reseñas van por separado: no pasan por React Query, la sección las
  // recibe por props. Sin esto se montaba vacía y a los 6–9s insertaba ~715px
  // arriba de #new-in-fw26, que era lo último que quedaba del CLS del home.
  const [, reviews, ss27] = await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['products'], queryFn: fetchAllProducts }),
    fetchHomeReviews(4),
    loadSs27Page(),
  ]);

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
        {/* Orden: el drop nuevo arriba (SS27 + sus looks), después FW26, best
            sellers, básicos, editorial y la prueba social al final. Promo y
            Flash Sale devuelven null sin campaña. */}
        <div className="relative z-10 bg-white">
          <Promo3x2Section />
          <FlashSaleSection />
          <Ss27Feed products={ss27.state === 'open' ? ss27.products : []} variant={feedVariant} />
          <ShopTheLook />
          <NewInFW26 />
          <VideoSection />
          <BackInStock />
          <BasicosSection />
          <EditorialBanner />
          <MasHypeSection />
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
