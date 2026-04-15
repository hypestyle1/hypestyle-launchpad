import { useState } from "react";
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

interface LookProduct {
  category: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

interface Look {
  id: string;
  title: string;
  image: string;
  products: LookProduct[];
}

const looks: Look[] = [
  {
    id: "look-01",
    title: "Camo Set — Look 01",
    image: "stl-look-camo-front.png",
    products: [
      { category: "Set", name: "Camo Set Completo", price: 85000, image: "product-camo-set-completo.webp", slug: "camo-set-completo" },
      { category: "Accesorio", name: "Camo Cap Orange", price: 15000, image: "product-camo-cap-orange.webp", slug: "camo-cap-orange" },
    ],
  },
  {
    id: "look-02",
    title: "Camo Set — Look 02",
    image: "stl-look-camo-side.webp",
    products: [
      { category: "Set", name: "Camo Set Completo", price: 85000, image: "product-camo-set-completo.webp", slug: "camo-set-completo" },
      { category: "Accesorio", name: "Camo Cap Orange", price: 15000, image: "product-camo-cap-orange.webp", slug: "camo-cap-orange" },
    ],
  },
  {
    id: "look-03",
    title: "Camo Set — Look 03",
    image: "stl-look-camo-side2.png",
    products: [
      { category: "Set", name: "Camo Set Completo", price: 85000, image: "product-camo-set-completo.webp", slug: "camo-set-completo" },
      { category: "Accesorio", name: "Camo Cap Orange", price: 15000, image: "product-camo-cap-orange.webp", slug: "camo-cap-orange" },
    ],
  },
];

export default function ShopTheLook() {
  const dragRef = useDragScroll();
  const revealRef = useReveal();
  const [activeLook, setActiveLook] = useState<Look | null>(null);

  return (
    <section className="max-w-[1400px] mx-auto px-4 py-16 md:py-24" ref={revealRef}>
      <div className="reveal rd1">
        <SectionHeader title="Shop the Look" link="/looks/" />
      </div>

      <div
        ref={dragRef}
        className="reveal rd2 flex gap-[2px] overflow-x-auto no-scrollbar cursor-grab select-none"
      >
        {looks.map((look) => (
          <div
            key={look.id}
            className="min-w-[80vw] sm:min-w-[40vw] lg:min-w-[33.333%] flex-shrink-0"
          >
            <button
              onClick={() => setActiveLook(look)}
              className="relative w-full aspect-[3/4] overflow-hidden bg-bg-alt group block text-left"
            >
              <img
                src={`/${look.image}`}
                alt={look.title}
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />

              {/* Hover button */}
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
                          src={`/${product.image}`}
                          alt={product.name}
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
                        <p className="text-[14px] font-semibold text-foreground mt-0.5">
                          ${product.price.toLocaleString("es-AR")}
                        </p>
                        <a
                          href={`/producto/${product.slug}`}
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
