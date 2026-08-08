import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchProductSlugs } from '@/lib/wp-products';
import { getCachedDiscountStatus } from '@/lib/goal-discount';
import { fetchProductDetail } from '@/lib/product-detail';
import { buildMetadata, truncate } from '@/lib/seo';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import JsonLd from '@/components/JsonLd';
import ProductoClient from './ProductoClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

/**
 * El fetch se hace en el servidor y Next lo deduplica: generateMetadata y el
 * componente piden el mismo producto y sale una sola llamada a WPGraphQL.
 */
async function getProduct(slug: string) {
  return fetchProductDetail(slug, { server: true }).catch(() => undefined);
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
  });
}

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const [product, initialGoalDiscount] = await Promise.all([
    getProduct(params.slug),
    getCachedDiscountStatus().catch(() => null),
  ]);

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
        initialGoalDiscount={initialGoalDiscount}
      />
    </>
  );
}
