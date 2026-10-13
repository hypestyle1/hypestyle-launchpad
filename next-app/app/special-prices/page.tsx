import SaleView from "./SaleView";
import { fetchAllProducts } from "@/lib/products-server";
import { BEST_SELLERS_SLUGS } from "@/lib/best-sellers";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { collectionJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

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
      {/* La vista vive en SaleView (cliente); los datos y el SEO quedan acá,
          server con ISR. */}
      <SaleView destacados={destacados} resto={resto} maxOff={maxOff} />
    </>
  );
}
