import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import NewsletterPopup from "@/components/NewsletterPopup";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import BestSellers from "@/components/BestSellers";
import ShopTheLook from "@/components/ShopTheLook";
import BackInStock from "@/components/BackInStock";
import SpecialPrices from "@/components/SpecialPrices";
import Collections from "@/components/Collections";
import CollectionBanner from "@/components/CollectionBanner";
import EditorialBanner from "@/components/EditorialBanner";
import BenefitsStrip from "@/components/BenefitsStrip";
import Footer from "@/components/Footer";

export default function Index() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <NewsletterPopup />
      <main className="pt-[var(--offset)]">
        <Hero />
        <Marquee />
        <BestSellers />
        <ShopTheLook />
        <BackInStock />
        <SpecialPrices />
        <Collections />
        <CollectionBanner />
        <EditorialBanner />
        <BenefitsStrip />
      </main>
      <Footer />
    </>
  );
}
