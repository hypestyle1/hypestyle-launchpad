import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import { REGULAR_TEES_GROUPS } from "@/lib/regular-tees";
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Regular Tees',
  subtitle: 'Básicos premium — 100% algodón',
  groups: REGULAR_TEES_GROUPS,
};

const PATH = '/colecciones/regular-tees';
const SEO_DESCRIPTION =
  'Regular Tees de HYPESTYLE: básicos premium 100% algodón, corte regular. Los que siempre están disponibles.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function RegularTeesPage() {
  const initialProducts = await initialProductsBySlugs(config.groups.flatMap(g => g.slugs));
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: config.title, description: SEO_DESCRIPTION, path: PATH }),
          breadcrumbJsonLd([
            { name: 'Colecciones', path: '/colecciones/' },
            { name: config.title, path: PATH },
          ]),
        ]}
      />
      <CollectionGroupedPage config={config} initialProducts={initialProducts} />
    </>
  );
}
