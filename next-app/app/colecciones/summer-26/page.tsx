import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: "Summer '26",
  subtitle: 'La colección de verano',
  headerBg: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ef4444 100%)',
  dark: false,
  groups: [
    { label: 'Remeras', slugs: ['aeroblue-tees', 'aerogrey-tees', 'aeropink-tees', 'mesh-realtree-tee', 'mesh-realtree-pink-tee'] },
    { label: 'Jorts', slugs: ['jort-cargo-realtree-beige', 'jort-cargo-realtree-pink', 'lettering-pink-jort'] },
    { label: 'Pantalón', slugs: ['sweatpant-pink'] },
  ],
};

const PATH = '/colecciones/summer-26';
const SEO_DESCRIPTION =
  "Summer '26 de HYPESTYLE: mesh, fileteado y jorts para el verano. Remeras, jorts y pantalones de la colección más caliente.";

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Summer26Page() {
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
