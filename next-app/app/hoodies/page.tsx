import CategoriaPage from '@/components/CategoriaPage';
import JsonLd from '@/components/JsonLd';
import { getCategoryConfig } from '@/lib/category-config';
import { initialProductsFor } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const PATH = '/hoodies';
const config = getCategoryConfig(PATH)!;

export const metadata = buildMetadata({
  title: config.title,
  description: config.seoDescription,
  path: PATH,
});

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page() {
  const initialProducts = await initialProductsFor(config);
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: config.title, description: config.seoDescription, path: PATH }),
          breadcrumbJsonLd([{ name: config.title, path: PATH }]),
        ]}
      />
      <CategoriaPage initialProducts={initialProducts} />
    </>
  );
}
