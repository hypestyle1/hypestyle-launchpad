import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import NewsletterPopup from '@/components/NewsletterPopup';
import HeroHannaDrop from '@/components/HeroHannaDrop';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import SaleBanner from '@/components/SaleBanner';
import BasicosSection from '@/components/BasicosSection';
import MasHypeSection from '@/components/MasHypeSection';
import NewInFW26 from '@/components/NewInFW26';
import EditorialBanner from '@/components/EditorialBanner';
import BenefitsStrip from '@/components/BenefitsStrip';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import VideoSection from '@/components/VideoSection';
import ReviewsHomeSection from '@/components/reviews/ReviewsHomeSection';
import InstagramFeed from '@/components/InstagramFeed';
import Footer from '@/components/Footer';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchAllProducts } from '@/lib/products-server';
import { fetchHomeReviews } from '@/lib/reviews/server';
import { buildMetadata } from '@/lib/seo';

// Heroes anteriores (Hero + EventCountdown + PinnedIntro, HeroLaNuestra) siguen en el
// repo, sin usar, por si hay que volver. Hoy el hero principal es HeroHannaDrop.

// rawTitle: el título de la home se define entero acá, sin el sufijo de marca
// que lleva el resto del sitio (quedaría "…| HYPESTYLE" duplicando "Hype").
export const metadata = buildMetadata({
  title: 'Hype | Streetwear Argentino',
  rawTitle: true,
  description: 'HYPESTYLE® — streetwear argentino desde 2018. Hoodies, remeras, pants y sets de drops limitados. Envíos a todo el mundo.',
  path: '/',
});

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
 */
export default async function Home() {
  const queryClient = new QueryClient();
  // Las reseñas van por separado: no pasan por React Query, la sección las
  // recibe por props. Sin esto se montaba vacía y a los 6–9s insertaba ~715px
  // arriba de #new-in-fw26, que era lo último que quedaba del CLS del home.
  const [, reviews] = await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['products'], queryFn: fetchAllProducts }),
    fetchHomeReviews(4),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnnouncementBar />
      <Navbar />
      <NewsletterPopup />
      <main className="pt-[var(--offset)]">
        {/* El título del hero es una imagen, así que el H1 del documento va acá.
            Oculto a la vista (sr-only) pero presente en el DOM: sin esto la home
            no tenía ningún H1, ni para Google ni para lectores de pantalla. */}
        <h1 className="sr-only">
          HYPESTYLE — Streetwear argentino. Drops limitados, envíos a todo el mundo.
        </h1>
        <HeroHannaDrop />
        {/* z-10 + relative + bg-white: efecto cortina, esta sección sube y tapa el hero
            pineado (ver HeroHannaDrop). El fondo opaco es necesario acá (no alcanza con
            el de cada sección individual) para que no se vea el hero de fondo en los
            huecos entre secciones (ej. NewInFW26, que no trae fondo propio). */}
        <div className="relative z-10 bg-white">
          <SaleBanner />
          <Promo3x2Section />
          <FlashSaleSection />
          <BenefitsStrip />
          <ReviewsHomeSection initial={reviews} />
          <NewInFW26 />
          <ShopTheLook />
          <VideoSection />
          <BasicosSection />
          <BackInStock />
          <MasHypeSection />
          <EditorialBanner />
          {/* Último bloque antes del footer, a propósito: Clarity muestra que casi
              nadie llega hasta acá, así que no compite con el producto arriba. */}
          <InstagramFeed />
        </div>
      </main>
      <Footer />
    </HydrationBoundary>
  );
}
