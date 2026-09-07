import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SaleHero from "@/components/SaleHero";
import { fetchAllProducts } from "@/lib/products-server";
import { BEST_SELLERS_SLUGS } from "@/lib/best-sellers";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { collectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { isSaleActive } from "@/lib/sale";

export const revalidate = 60;

const PATH = '/special-prices/';
const TITLE = 'SALE';
// Sin nombre de campaña ni porcentaje fijo: al cerrar el Cold Archive (06/09/26)
// esta pagina dejo de ser la vitrina de una campaña y volvio a ser la lista
// permanente de lo que este rebajado en cada momento. Una description que
// prometa "hasta 50%" queda mintiendo apenas cambian los precios.
const DESCRIPTION =
  'Productos con precio rebajado en HYPESTYLE: remeras, hoodies, pants y accesorios. ' +
  'Mientras haya stock.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

/** Un producto entra al SALE si su precio actual está por debajo del de lista. */
function enSale(p: { badge?: string; originalPrice?: number; price: number }) {
  return !!p.originalPrice && p.originalPrice > p.price;
}

/** Sin stock = todos los talles agotados. */
function hayStock(p: { stock: Record<string, 'ok' | 'low' | 'out'> }) {
  const estados = Object.values(p.stock);
  return estados.length === 0 || estados.some(s => s !== 'out');
}

function descuento(p: { originalPrice?: number; price: number }) {
  return p.originalPrice ? 1 - p.price / p.originalPrice : 0;
}

/**
 * Cabecera de la pagina SALE fuera de campaña.
 *
 * Misma receta que el resto de las cabeceras de coleccion (fondo oscuro, centrada,
 * volanta + H1 + linea de detalle) en vez del rojo de Cold Archive: sin campaña
 * corriendo, el rojo no significa nada y el sitio tiene que verse como se ve
 * siempre. El heroe rojo sigue en components/SaleHero.tsx para la proxima.
 */
function SaleHeaderNeutro({ maxOff, total }: { maxOff: number; total: number }) {
  return (
    <section className="bg-bg-dark text-primary-foreground py-20 px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">Precios especiales</p>
      <h1 className="text-[36px] md:text-[52px] font-bold uppercase leading-none mb-3 text-white">Sale</h1>
      <p className="text-[14px] text-white/40">
        {total > 0
          ? `${total} ${total === 1 ? 'producto' : 'productos'} · hasta ${maxOff}% OFF · mientras haya stock`
          : 'Mientras haya stock'}
      </p>
    </section>
  );
}

export default async function SalePage() {
  const allProducts = await fetchAllProducts();

  // Los agotados se ocultan: en una liquidación, entrar a una ficha sin stock
  // es la peor experiencia posible. Siguen accesibles por /producto/[slug].
  const enOferta = allProducts.filter(p => enSale(p) && hayStock(p));

  // Destacados: la lista curada, en su orden (está pensada para grilla de 4).
  const orden = new Map(BEST_SELLERS_SLUGS.map((s, i) => [s, i]));
  const destacados = enOferta
    .filter(p => orden.has(p.slug))
    .sort((a, b) => orden.get(a.slug)! - orden.get(b.slug)!);

  // El resto, por profundidad de descuento: los mejores precios primero.
  const resto = enOferta
    .filter(p => !orden.has(p.slug))
    .sort((a, b) => descuento(b) - descuento(a));

  const total = destacados.length + resto.length;
  const maxOff = Math.round(Math.max(0, ...enOferta.map(descuento)) * 100);

  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({
            name: TITLE,
            description: DESCRIPTION,
            path: PATH,
            products: [...destacados, ...resto].map(p => ({ name: p.name, slug: p.slug })),
          }),
          breadcrumbJsonLd([{ name: TITLE, path: PATH }]),
        ]}
      />
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* Con campaña viva manda el heroe rojo de Cold Archive. Sin campaña la
            pagina sigue existiendo —siempre hay algo rebajado— pero con la
            cabecera neutra de la casa: el rojo es el acento de campaña, no el
            del sitio. Se decide en el servidor, igual que el resto de la pagina. */}
        {isSaleActive()
          ? <SaleHero maxOff={maxOff} total={total} />
          : <SaleHeaderNeutro maxOff={maxOff} total={total} />}

        {destacados.length > 0 && (
          <section className="max-w-[1400px] mx-auto px-4 pt-10 md:pt-14">
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-[18px] md:text-[22px] font-bold uppercase tracking-tight">Destacados</h2>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Los mejores productos al mejor precio
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
              {destacados.map(p => (
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
          </section>
        )}

        {resto.length > 0 && (
          <section className="max-w-[1400px] mx-auto px-4 pt-10 md:pt-14 pb-10 md:pb-16">
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-[18px] md:text-[22px] font-bold uppercase tracking-tight">Todo el sale</h2>
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {resto.length} productos, del mayor descuento al menor
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
              {resto.map(p => (
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
          </section>
        )}

        {total === 0 && (
          <p className="text-center text-muted-foreground py-20">
            El sale vuelve pronto. Mientras tanto, mirá las novedades.
          </p>
        )}

      </main>
      <Footer />
    </>
  );
}
