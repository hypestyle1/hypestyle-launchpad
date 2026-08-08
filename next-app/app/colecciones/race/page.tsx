import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
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

export default function RacePage() {
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
