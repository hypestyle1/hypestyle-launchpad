import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import { MAS_HYPE_GROUPS } from "@/lib/mas-hype";
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Más Hype',
  subtitle: 'El resto del catálogo — piezas únicas, colabs y clásicos',
  groups: MAS_HYPE_GROUPS,
};

const PATH = '/colecciones/mas-hype/';
const SEO_DESCRIPTION =
  'Más Hype: el resto del catálogo de HYPESTYLE. Piezas únicas, colabs y clásicos que siguen disponibles.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function MasHypePage() {
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
