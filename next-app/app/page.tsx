import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import NewsletterPopup from '@/components/NewsletterPopup';
import Hero from '@/components/Hero';
import ShopTheLook from '@/components/ShopTheLook';
import BackInStock from '@/components/BackInStock';
import CollectionBanner from '@/components/CollectionBanner';
import EditorialBanner from '@/components/EditorialBanner';
import BenefitsStrip from '@/components/BenefitsStrip';
import VideoSection from '@/components/VideoSection';
import Footer from '@/components/Footer';
import EventCountdown from '@/components/EventCountdown';

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <NewsletterPopup />
      <main className="pt-[var(--offset)]">
        <Hero />
        <EventCountdown />
        <BenefitsStrip />
        <CollectionBanner />
        <ShopTheLook />
        <VideoSection />
        <BackInStock />
        <EditorialBanner />
      </main>
      <Footer />
    </>
  );
}
