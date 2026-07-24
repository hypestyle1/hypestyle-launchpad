import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import NewsletterPopup from '@/components/NewsletterPopup';
import HeroHannaDrop from '@/components/HeroHannaDrop';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import CollectionBanner from '@/components/CollectionBanner';
import NewInFW26 from '@/components/NewInFW26';
import EditorialBanner from '@/components/EditorialBanner';
import BenefitsStrip from '@/components/BenefitsStrip';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import FinalSection from '@/components/FinalSection';
import VideoSection from '@/components/VideoSection';
import Footer from '@/components/Footer';

// Heroes anteriores (Hero + EventCountdown + PinnedIntro, HeroLaNuestra) siguen en el
// repo, sin usar, por si hay que volver. Hoy el hero principal es HeroHannaDrop.

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <NewsletterPopup />
      <main className="pt-[var(--offset)]">
        <HeroHannaDrop />
        <FinalSection />
        <Promo3x2Section />
        <FlashSaleSection />
        <BenefitsStrip />
        <NewInFW26 />
        <ShopTheLook />
        <VideoSection />
        <CollectionBanner />
        <BackInStock />
        <EditorialBanner />
      </main>
      <Footer />
    </>
  );
}
