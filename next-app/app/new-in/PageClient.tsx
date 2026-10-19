'use client';

import Image from 'next/image';
import Link from 'next/link';
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import CatalogHeader from "@/components/collection/CatalogHeader";
import VistaControles from "@/components/collection/VistaControles";
import { useVistaCatalogo } from "@/lib/catalogo-vista";
import { useReveal } from "@/hooks/useReveal";
import { useProducts } from "@/hooks/useProducts";
import type { NormalizedProduct } from "@/lib/products-normalize";
import { SS27_HERO_IMAGES } from "@/lib/ss27-coleccion";

/**
 * /new-in (rediseño 2026): cabecera editorial compacta, lo más nuevo primero
 * (la API ordena por fecha ascendente, se invierte), agotados al fondo, badge
 * "New In" con precio mudo (novedad, no liquidación), y las fotos de campaña
 * SS27 (ya servidas desde public/) como banda editorial después de las
 * primeras dos filas. Sin media nueva arriba del fold.
 */

const enStock = (p: NormalizedProduct) => Object.values(p.stock).some((s) => s !== 'out');

/** `initialProducts`: traídos en el servidor (lib/catalog.ts) para el HTML inicial. */
export default function NewInPage({ initialProducts }: { initialProducts?: NormalizedProduct[] }) {
  const { data: rawProducts = [], isLoading } = useProducts(100, undefined, 'new-in', initialProducts);
  const newestFirst = [...rawProducts].reverse();
  const products = [...newestFirst.filter(enStock), ...newestFirst.filter((p) => !enStock(p))];
  const ref = useReveal([products]);
  const { cols, setCols, foto, setFoto, grid } = useVistaCatalogo();

  const primeras = products.slice(0, 8);
  const resto = products.slice(8);

  const card = (p: NormalizedProduct) => (
    <ProductCard key={p.slug} id={p.slug} tags={p.tags} name={p.name} category={p.category}
      price={p.price} originalPrice={p.originalPrice} badge="New In" mutedPrice
      image={p.image} images={p.images} sizes={p.sizes} stock={p.stock} href={p.href}
      vistaFoto={foto} />
  );

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <section className="px-4 md:px-6 pt-2 pb-10 md:pb-14" ref={ref}>
          <CatalogHeader
            kicker="Shop"
            title="New In"
            count={products.length}
            description="Lo último que entró, de más nuevo a más viejo. SS27 primero."
          />
          <div className="flex justify-end mb-3">
            <VistaControles cols={cols} setCols={setCols} foto={foto} setFoto={setFoto} />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className={grid}>{primeras.map(card)}</div>

              {/* La campaña del drop vigente como banda entre filas. */}
              <div className="-mx-4 md:-mx-6 my-10 md:my-14 grid grid-cols-2 gap-px bg-white">
                {SS27_HERO_IMAGES.slice(0, 2).map((img) => (
                  <Link key={img.src} href="/colecciones/ss27" className="group relative block aspect-[3/4] md:aspect-[4/3] overflow-hidden bg-bg-alt">
                    <Image src={img.src} alt={img.alt} fill sizes="50vw" quality={70} className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]" />
                    <span className="absolute left-3 bottom-3 md:left-5 md:bottom-5 text-white text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.02em] underline underline-offset-4 [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
                      Spring Summer 27
                    </span>
                  </Link>
                ))}
              </div>

              {resto.length > 0 && <div className={grid}>{resto.map(card)}</div>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
