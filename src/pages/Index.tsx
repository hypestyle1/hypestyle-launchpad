import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import BestSellers from "@/components/BestSellers";
import ShopTheLook from "@/components/ShopTheLook";
import BackInStock from "@/components/BackInStock";
import SpecialPrices from "@/components/SpecialPrices";
import Collections from "@/components/Collections";
import EditorialBanner from "@/components/EditorialBanner";
import BenefitsStrip from "@/components/BenefitsStrip";
import Footer from "@/components/Footer";

export default function Index() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <Hero />
        <Marquee />
        <BestSellers />
        <ShopTheLook />
        <BackInStock />
        <SpecialPrices />
        <Collections />
        <EditorialBanner />
        <BenefitsStrip />
      </main>
      <Footer />
    </>
  );
}
