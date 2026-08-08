import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { fetchAllProducts } from "@/lib/products-server";
import { BEST_SELLERS_SLUGS } from "@/lib/best-sellers";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { collectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

export const revalidate = 60;

const PATH = '/special-prices/';
const TITLE = 'Productos en promoción';
const DESCRIPTION =
  'Todas las prendas de HYPESTYLE en oferta. Hoodies, remeras, pants y accesorios con descuento, mientras haya stock.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default async function SpecialPricesPage() {
  const allProducts = await fetchAllProducts();
  // Promos que NO están en Best Sellers (para no repetir y destacar el resto)
  const bestSellers = new Set(BEST_SELLERS_SLUGS);
  const products = allProducts.filter(p => p.badge && p.originalPrice && !bestSellers.has(p.slug));

  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({
            name: TITLE,
            description: DESCRIPTION,
            path: PATH,
            products: products.map(p => ({ name: p.name, slug: p.slug })),
          }),
          breadcrumbJsonLd([{ name: TITLE, path: PATH }]),
        ]}
      />
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        <section className="max-w-[1400px] mx-auto px-4 pt-8 md:pt-12">
          <div className="flex items-center gap-3">
            <span className="bg-red-600 text-white text-[15px] md:text-[17px] font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 rounded-[6px]">
              SALE
            </span>
            <h1 className="text-[20px] md:text-[26px] font-bold uppercase tracking-tight">Productos en promoción</h1>
          </div>
          <p className="text-[12px] text-muted-foreground mt-3">{products.length} productos en oferta</p>
        </section>

        <section className="max-w-[1400px] mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
            {products.map((p) => (
              <ProductCard
                key={p.slug}
                id={p.slug}
                name={p.name}
                category={p.category}
                price={p.price}
                originalPrice={p.originalPrice}
                badge={p.badge}
                image={p.image}
                images={p.images}
                sizes={p.sizes}
                stock={p.stock}
                href={p.href}
              />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-center text-muted-foreground py-20">No hay productos en oferta en este momento.</p>
          )}
        </section>

      </main>
      <Footer />
    </>
  );
}
