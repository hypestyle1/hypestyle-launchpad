import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import NewsletterPopup from '@/components/NewsletterPopup';
import HeroLaNuestra from '@/components/HeroLaNuestra';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import CollectionBanner from '@/components/CollectionBanner';
import NewInFW26 from '@/components/NewInFW26';
import EditorialBanner from '@/components/EditorialBanner';
import BenefitsStrip from '@/components/BenefitsStrip';
import FlashSaleSection from '@/components/FlashSaleSection';
import Promo3x2Section from '@/components/Promo3x2Section';
import VideoSection from '@/components/VideoSection';
import Footer from '@/components/Footer';

// Hero anterior (Hero + EventCountdown + PinnedIntro) sigue en el repo, sin usar,
// por si hay que volver. Hoy el hero principal es HeroLaNuestra (lanzamiento Mundial).

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <NewsletterPopup />
      <main className="pt-[var(--offset)]">
        <HeroLaNuestra />
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
