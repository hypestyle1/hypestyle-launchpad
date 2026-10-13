import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Camo Set Drop',
  subtitle: 'Set completo en camo print',
  headerImage: '/fw26-camo-editorial.webp',
  groups: [
    { label: 'Conjunto', slugs: ['camo-full-set-combo', 'zip-hoodie-camo', 'sweatpant-camo'] },
    { label: 'Accesorios', slugs: ['camo-cap', 'beanie-camo'] },
  ],
};

const PATH = '/colecciones/camo-set-drop';
const SEO_DESCRIPTION =
  'Camo Set Drop: conjunto completo en camo full print. Zip hoodie, sweatpant, gorra y beanie de edición limitada.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function CamoSetDropPage() {
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
