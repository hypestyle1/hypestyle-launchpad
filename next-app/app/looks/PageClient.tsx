'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopTheLook from "@/components/ShopTheLook";

// /looks usa el mismo line-up + giro que el home. Antes tenía su propia grilla
// y su propio drawer, duplicados del componente del home.
export default function LooksPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">
        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">SS27</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">Shop the Look</h1>
          <p className="text-[14px] text-primary-foreground/40">Tocá un look para ver qué lleva puesto</p>
        </section>
        <ShopTheLook />
      </main>
      <Footer />
    </>
  );
}
