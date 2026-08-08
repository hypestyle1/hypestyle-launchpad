'use client';

import { useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { imgSrc } from "@/lib/img";
import { useLocale } from "@/context/LocaleContext";
import { useReveal } from "@/hooks/useReveal";
import { LOOKS, type Look } from "@/data/looks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { X } from "lucide-react";

export default function LooksPage() {
  const [activeLook, setActiveLook] = useState<Look | null>(null);
  const { formatPrice } = useLocale();
  const ref = useReveal();

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/40 mb-3">Inspiración</p>
          <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3">Shop the Look</h1>
          <p className="text-[14px] text-primary-foreground/40">Outfits completos — hacé click para ver los productos</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={ref}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {LOOKS.map((look, i) => (
              <div key={look.id} className={`reveal rd${Math.min(i + 1, 8)}`}>
                <button
                  onClick={() => setActiveLook(look)}
                  className="relative w-full aspect-[3/4] overflow-hidden bg-bg-alt group block text-left"
                >
                  <img
                    src={imgSrc(look.image)}
                    alt={look.title}
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-[13px] font-semibold">{look.title}</p>
                    <p className="text-white/70 text-[11px]">{look.products.length} {look.products.length === 1 ? 'producto' : 'productos'}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="px-6 py-2.5 bg-primary-foreground text-foreground text-[12px] font-semibold uppercase tracking-wider">
                      Ver look →
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Sheet open={!!activeLook} onOpenChange={(open) => !open && setActiveLook(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[380px] bg-background p-0 border-l border-border [&>button:last-child]:hidden"
        >
          {activeLook && (
            <>
              <SheetHeader className="flex flex-row items-center justify-between p-5 pb-4 border-b border-border space-y-0">
                <SheetTitle className="text-[15px] font-bold uppercase tracking-tight">
                  {activeLook.title}
                </SheetTitle>
                <SheetClose className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar</span>
                </SheetClose>
              </SheetHeader>

              <div className="p-5 space-y-0 overflow-y-auto max-h-[calc(100vh-80px)]">
                {activeLook.products.map((product, i) => (
                  <div key={product.slug}>
                    <div className="flex gap-4 py-4">
                      <div className="w-20 h-20 flex-shrink-0 bg-bg-alt overflow-hidden">
                        <img
                          src={imgSrc(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light mb-0.5">{product.category}</p>
                        <p className="text-[14px] font-medium leading-tight text-foreground">{product.name}</p>
                        {product.price > 0 && (
                          <p suppressHydrationWarning className="text-[14px] font-semibold text-foreground mt-0.5">
                            {formatPrice(product.price)}
                          </p>
                        )}
                        <a
                          href={`/producto/${product.slug}/`}
                          onClick={() => setActiveLook(null)}
                          className="text-[12px] text-border-mid hover:text-foreground transition-colors mt-1 inline-block"
                        >
                          Ver producto →
                        </a>
                      </div>
                    </div>
                    {i < activeLook.products.length - 1 && <div className="border-b border-border" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </>
  );
}
