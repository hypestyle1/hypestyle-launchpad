import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
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

const PATH = '/colecciones/summer-26/';
const SEO_DESCRIPTION =
  "Summer '26 de HYPESTYLE: mesh, fileteado y jorts para el verano. Remeras, jorts y pantalones de la colección más caliente.";

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function Summer26Page() {
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
