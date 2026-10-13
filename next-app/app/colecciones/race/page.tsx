import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Race',
  subtitle: 'Motorsport · Estética vintage racing',
  groups: [
    { label: 'Hoodie', slugs: ['no-service-for-the-faithless-hoodie'] },
    { label: 'Remeras', slugs: ['race-tee', 'race-tee-gris', 'no-service-for-the-faithless-white', 'no-service-for-the-faithless-black', 'no-service-for-the-faithless-grey', 'no-service-for-the-faithless-green'] },
  ],
};

const PATH = '/colecciones/race/';
const SEO_DESCRIPTION =
  'Colección Race de HYPESTYLE: motorsport y estética vintage racing. Hoodie y remeras No Service For The Faithless.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function RacePage() {
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
