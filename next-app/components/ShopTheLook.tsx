'use client';

import { useState, useEffect } from "react";
import { imgSrc } from "@/lib/img";
import { useLocale } from "@/context/LocaleContext";
import SectionHeader from "./SectionHeader";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useReveal } from "@/hooks/useReveal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import { LOOKS, type Look } from "@/data/looks";

export default function ShopTheLook() {
  const dragRef = useDragScroll();
  const revealRef = useReveal();
  const [activeLook, setActiveLook] = useState<Look | null>(null);
  const { formatPrice } = useLocale();

  // Arranca con el orden natural (igual en server y cliente) para que el primer render
  // no tenga mismatch de hidratación, y recién en el efecto (solo cliente) se reordena al
  // azar. Antes el shuffle corría directo en el render con useMemo: en el server daba un
  // orden y al hidratar en el cliente daba OTRO, entonces la imagen que quedaba pintada
  // (la del server) no coincidía con el look enganchado al click (el del cliente) — por
  // eso se abría un look distinto al que se tocaba.
  const [visibleLooks, setVisibleLooks] = useState<Look[]>(() => LOOKS.slice(0, 4));

  useEffect(() => {
    const key = 'hype_looks_order';
    let order: string[] = [];
    try { order = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch {}
    if (order.length !== LOOKS.length) {
      order = [...LOOKS].sort(() => Math.random() - 0.5).map(l => l.id);
      try { sessionStorage.setItem(key, JSON.stringify(order)); } catch {}
    }
    const sorted = order.map(id => LOOKS.find(l => l.id === id)).filter(Boolean) as Look[];
    setVisibleLooks(sorted.slice(0, 4));
  }, []);

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-10 md:py-14" ref={revealRef}>
      <div className="reveal rd1">
        <SectionHeader title="Shop the Look" link="/looks/" />
      </div>

      <div
        ref={dragRef}
        className="reveal rd2 flex gap-[2px] overflow-x-auto no-scrollbar snap-x snap-mandatory cursor-grab select-none px-[10vw] md:px-0"
      >
        {visibleLooks.map((look) => (
          // hover:scale/z-10 solo desde md: en mobile no hay hover real y el estado
          // puede quedar "pegado" en la tarjeta anterior tras tocarla; con el carrusel
          // por snap, esa tarjeta agrandada y elevada tapaba el borde de la tarjeta
          // siguiente y el tap terminaba abriendo el look equivocado.
          <div
            key={look.id}
            className="flex-none w-[80vw] md:flex-1 snap-center transition-transform duration-300 ease-out md:hover:scale-[1.02] md:hover:z-10 relative"
          >
            <button
              onClick={() => setActiveLook(look)}
              className="relative w-full aspect-[3/4] overflow-hidden rounded-[8px] bg-bg-alt group block text-left"
            >
              {/* loading/decoding + width/height: la sección está bien abajo del
                  pliegue pero las 4 fotos se pedían de una, junto con el hero.
                  Con width/height el navegador además reserva el alto antes de
                  que baje la imagen (si no, cuenta como layout shift). */}
              <img
                src={imgSrc(look.image)}
                alt={look.title}
                width={900}
                height={1200}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="px-6 py-2.5 bg-primary-foreground text-foreground text-[12px] font-semibold uppercase tracking-wider">
                  Ver look →
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Look Drawer */}
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
                      {/* Product thumbnail */}
                      <div className="w-20 h-20 flex-shrink-0 bg-bg-alt overflow-hidden">
                        <img
                          src={imgSrc(product.image)}
                          alt={product.name}
                          width={80}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>

                      {/* Product info */}
                      <div className="flex flex-col justify-center min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light mb-0.5">
                          {product.category}
                        </p>
                        <p className="text-[14px] font-medium leading-tight text-foreground">
                          {product.name}
                        </p>
                        <p suppressHydrationWarning className="text-[14px] font-semibold text-foreground mt-0.5">
                          {formatPrice(product.price)}
                        </p>
                        <a
                          href={`/producto/${product.slug}/`}
                          onClick={() => setActiveLook(null)}
                          className="text-[12px] text-border-mid hover:text-foreground transition-colors mt-1 inline-block"
                        >
                          Ver producto →
                        </a>
                      </div>
                    </div>
                    {i < activeLook.products.length - 1 && (
                      <div className="border-b border-border" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
