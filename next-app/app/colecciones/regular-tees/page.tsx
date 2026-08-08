import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import { REGULAR_TEES_GROUPS } from "@/lib/regular-tees";
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Regular Tees',
  subtitle: 'Básicos premium — 100% algodón',
  groups: REGULAR_TEES_GROUPS,
};

const PATH = '/colecciones/regular-tees/';
const SEO_DESCRIPTION =
  'Regular Tees de HYPESTYLE: básicos premium 100% algodón, corte regular. Los que siempre están disponibles.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function RegularTeesPage() {
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
      <CollectionGroupedPage config={config} />
    </>
  );
}
