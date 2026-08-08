import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Pink Set Drop',
  subtitle: 'Drop limitado — Todo en rosa',
  headerBg: 'linear-gradient(135deg, #f9a8d4 0%, #fbcfe8 50%, #fce7f3 100%)',
  dark: false,
  groups: [
    { label: 'Conjunto', slugs: ['zip-hoodie-pink', 'sweatpant-pink'] },
    { label: 'Remeras', slugs: ['aeropink-tees', 'mesh-realtree-pink-tee', 'forpain-sleveless-pink'] },
    { label: 'Jorts', slugs: ['lettering-pink-jort', 'jort-cargo-realtree-pink'] },
  ],
};

const PATH = '/colecciones/pink-set-drop/';
const SEO_DESCRIPTION =
  'Pink Set Drop: todo en rosa. Zip hoodie, sweatpant, remeras y jorts de un drop limitado de HYPESTYLE.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function PinkSetDropPage() {
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
