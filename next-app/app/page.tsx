import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import NewsletterPopup from '@/components/NewsletterPopup';
import HeroHannaDrop from '@/components/HeroHannaDrop';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import BasicosSection from '@/components/BasicosSection';
import MasHypeSection from '@/components/MasHypeSection';
import NewInFW26 from '@/components/NewInFW26';
import EditorialBanner from '@/components/EditorialBanner';
import BenefitsStrip from '@/components/BenefitsStrip';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import VideoSection from '@/components/VideoSection';
import ReviewsHomeSection from '@/components/reviews/ReviewsHomeSection';
import Footer from '@/components/Footer';
import { buildMetadata } from '@/lib/seo';

// Heroes anteriores (Hero + EventCountdown + PinnedIntro, HeroLaNuestra) siguen en el
// repo, sin usar, por si hay que volver. Hoy el hero principal es HeroHannaDrop.

// rawTitle: la home mantiene "Hype." a secas en la pestaña (decisión de marca).
export const metadata = buildMetadata({
  title: 'Hype.',
  rawTitle: true,
  description: 'HYPESTYLE® — streetwear argentino desde 2018. Hoodies, remeras, pants y sets de drops limitados. Envíos a todo el mundo.',
  path: '/',
});

export default function Home() {
  return (
    <>
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
          <Promo3x2Section />
          <FlashSaleSection />
          <BenefitsStrip />
          <ReviewsHomeSection />
          <NewInFW26 />
          <ShopTheLook />
          <VideoSection />
          <BasicosSection />
          <BackInStock />
          <MasHypeSection />
          <EditorialBanner />
        </div>
      </main>
      <Footer />
    </>
  );
}
