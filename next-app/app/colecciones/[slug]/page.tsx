import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoriaPage from '@/components/CategoriaPage';
import JsonLd from '@/components/JsonLd';
import { getCategoryConfig } from '@/lib/category-config';
import { initialProductsFor } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const path = (slug: string) => `/colecciones/${slug}/`;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const config = getCategoryConfig(path(params.slug));
  if (!config) {
    return buildMetadata({
      title: 'Colección no encontrada',
      description: 'La colección que buscás no está disponible.',
      path: path(params.slug),
      noindex: true,
    });
  }
  return buildMetadata({
    title: config.title,
    description: config.seoDescription,
    path: path(params.slug),
  });
}

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page({ params }: { params: { slug: string } }) {
  const config = getCategoryConfig(path(params.slug));

  // Sin esto la ruta era un catch-all: /colecciones/loquesea devolvía HTTP 200
  // con el listado de "Todos los productos" (el fallback de CategoriaPage), otro
  // soft 404. Las colecciones con página propia (fw26, faith-is-the-real-hype,
  // pink-set-drop, mas-hype) tienen prioridad sobre esta ruta y no llegan acá.
  if (!config) notFound();
  const initialProducts = await initialProductsFor(config);

  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({
            name: config.title,
            description: config.seoDescription,
            path: path(params.slug),
          }),
          breadcrumbJsonLd([
            { name: 'Colecciones', path: '/colecciones/' },
            { name: config.title, path: path(params.slug) },
          ]),
        ]}
      />
      <CategoriaPage initialProducts={initialProducts} />
    </>
  );
}
