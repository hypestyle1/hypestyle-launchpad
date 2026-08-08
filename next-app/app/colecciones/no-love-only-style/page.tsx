import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'No Love, Only Style',
  subtitle: 'Drop 01 — 2025',
  groups: [
    { label: 'Remeras & Tops', slugs: ['baby-come-back-tees', 'no-love-only-style-tops'] },
    { label: 'Accesorios', slugs: ['trucker-cap-baby-come-back'] },
  ],
};

const PATH = '/colecciones/no-love-only-style/';
const SEO_DESCRIPTION =
  'No Love, Only Style — Drop 01. El primer drop de la era HYPESTYLE: gráficos crudos, actitud sin filtro, producción limitada.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function NoLoveOnlyStylePage() {
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
