import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { crearProteccionFichas } from '@/lib/wp-cortacircuitos';
import { fetchProductSlugs } from '@/lib/wp-products';
import { prerenderizarFichas } from '@/lib/build-env';
import { getCachedDiscountStatus, GOAL_PRODUCT_SLUG } from '@/lib/goal-discount';
import { fetchProductDetailParaFicha, aplicarImagenesDeColorway, SERVER_REVALIDATE } from '@/lib/product-detail';
import { fetchCatalogForSsr } from '@/lib/catalog';
import { buildMetadata, truncate } from '@/lib/seo';
import { SLUGS_INTERNOS } from '@/lib/catalog';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import JsonLd from '@/components/JsonLd';
import { mysteryPreview } from '@/lib/mystery-preview';
import ProductoClient from './ProductoClient';

export const revalidate = 3600;
export const dynamicParams = true;

// En previews y CI no se prerenderizan las fichas: ver lib/build-env.ts.
export async function generateStaticParams() {
  if (!prerenderizarFichas()) return [];
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

/**
 * El fetch se hace en el servidor y Next lo deduplica: generateMetadata y el
 * componente piden el mismo producto y sale una sola llamada a WPGraphQL.
 */
async function getProduct(slug: string) {
  // Sin .catch(): undefined es SOLO "el slug no existe" (fetchProductDetailParaFicha ya
  // distingue ese caso). Un WP caído lanza y Next conserva la última página
  // buena en vez de cachear un 404 durante una hora.
  //
  // Incidente MySQL/Hostinger 4/11/2026: con `fetch` + revalidate, cada
  // regeneración de la ficha ESPERABA a WordPress (y reintentaba en cada
  // visita si fallaba). productoCompartido sirve el último dato bueno al
  // instante y actualiza en segundo plano; ver lib/catalog.ts.
  return productoCompartido(slug);
}

// Por slug: una lectura por ficha a la vez y 60 s de pausa tras una falla.
// Global: como mucho 2 fichas leyendo WordPress a la vez por instancia
// (9/11/2026: un crawler disparaba ~300 refrescos juntos).
const protegerFicha = crearProteccionFichas(2, 60_000);
const productoCompartido = unstable_cache(
  (slug: string) => protegerFicha(slug, () => fetchProductDetailParaFicha(slug)),
  ['ficha-producto-v1'],
  { revalidate: 300 }, // 4/11: 60 s disparaba actualizaciones constantes contra WP con tráfico alto
);

/**
 * Miniaturas de las colorways desde el catálogo compartido (una lectura cada
 * 5 min para toda la tienda) en vez de una consulta por ficha. Si el catálogo
 * no está disponible, la ficha sale igual con las imágenes de COLORWAYS, como
 * hacía antes cuando la consulta de colorways fallaba.
 */
async function conImagenesDeColorway<T extends Parameters<typeof aplicarImagenesDeColorway>[0]>(product: T): Promise<T> {
  if (product.colors.length < 2) return product;
  try {
    return aplicarImagenesDeColorway(product, await fetchCatalogForSsr()) as T;
  } catch {
    return product;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  // Sin producto la página devuelve 404; el noindex evita que Google guarde
  // el slug muerto mientras tanto.
  if (!product) {
    return buildMetadata({
      title: 'Producto no encontrado',
      description: 'El producto que buscás no está disponible.',
      path: `/producto/${params.slug}/`,
      noindex: true,
    });
  }

  const price = product.price
    ? ` $${product.price.toLocaleString('es-AR')}`
    : '';
  const description = product.description
    ? truncate(product.description)
    : truncate(`${product.name} — ${product.category} ${product.fit} de HYPESTYLE.${price}. Envíos a todo el mundo.`);

  return buildMetadata({
    title: product.name,
    description,
    path: `/producto/${product.slug}/`,
    image: product.images.find(Boolean) || '/og-image.png',
    imageAlt: product.name,
    // Productos técnicos (regalo, gift card, el sleeveless que junta los cuatro
    // colores): siguen publicados y funcionando para el checkout y los regalos,
    // pero no son páginas para buscar. Fuera del índice y del sitemap.
    ...(SLUGS_INTERNOS.has(product.slug) ? { noindex: true, follow: true } : {}),
  });
}

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const [productoWoo, initialGoalDiscount] = await Promise.all([
    getProduct(params.slug),
    // El descuento por gol es solo de la camiseta (el servidor lo cobra solo
    // ahí). Pasarlo a cualquier ficha mostraba el −% en todo el catálogo y
    // después el checkout cobraba el precio lleno. Igual que /personalizar.
    params.slug === GOAL_PRODUCT_SLUG ? getCachedDiscountStatus().catch(() => null) : Promise.resolve(null),
  ]);

  // Las tres cajas Mystery todavía no existen en Woo: en local se renderizan
  // con el mock para poder diseñar y aprobar la ficha ANTES de crearlas.
  // Woo siempre gana —el mock solo entra si el slug no existe— y en
  // producción `mysteryPreview` devuelve undefined. Al crear los productos
  // este bloque y lib/mystery-preview.ts se borran.
  const previo = productoWoo ? undefined : mysteryPreview(params.slug);
  const product = productoWoo ? await conImagenesDeColorway(productoWoo) : previo;

  // 404 real. Antes el fetch era client-side y un slug inexistente devolvía
  // HTTP 200 con el cartel "Producto no encontrado" — un soft 404, que Google
  // penaliza. Afectaba a todo producto borrado o despublicado en WooCommerce.
  if (!product) notFound();

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: 'Productos', path: '/productos/' },
            { name: product.name, path: `/producto/${product.slug}/` },
          ]),
        ]}
      />
      <ProductoClient
        slug={params.slug}
        initialProduct={product}
        // Peor caso de edad del dato: el fetch del producto se cachea
        // SERVER_REVALIDATE segundos, así que puede ser así de viejo al
        // renderizar. useProduct lo re-pide desde el browser si se pasó.
        initialProductAt={Date.now() - SERVER_REVALIDATE * 1000}
        initialGoalDiscount={initialGoalDiscount}
        soloServidor={!!previo}
      />
    </>
  );
}
