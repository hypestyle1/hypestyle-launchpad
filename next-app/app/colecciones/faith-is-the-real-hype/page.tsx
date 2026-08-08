import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const config: CollectionConfig = {
  title: 'Faith Is The Real Hype',
  subtitle: 'Streetwear con fe · Gráficos religiosos, corte oversize',
  groups: [
    { label: 'Hoodies', slugs: ['christ-reigns-hoodie', 'he-die-so-i-could-live-hoodie', 'lion-of-judah-stone-wash-hoodie', 'he-died-so-i-could-live-melange-hoodie', 'faith-over-everything-camo-hoodie', 'hs-co-grey-hoodie'] },
    { label: 'Remeras', slugs: ['christ-reigns-tee', 'jesus-heart-tee', 'only-god-can-judge-me-blanca', 'only-god-can-judge-me-negra', 'lamb-of-god-pink-tee'] },
    { label: 'Longsleeve', slugs: ['longsleeve-waffle-horses', 'longsleeve-waffle-god-gave-me-style'] },
    { label: 'Sweater', slugs: ['sweater-distressed-hs-co'] },
  ],
};

const PATH = '/colecciones/faith-is-the-real-hype/';
const SEO_DESCRIPTION =
  'Faith Is The Real Hype: streetwear con fe. Hoodies, remeras y longsleeves con gráficos religiosos, corte oversize.';

export const metadata = buildMetadata({
  title: config.title,
  description: SEO_DESCRIPTION,
  path: PATH,
});

export default function FaithIsTheRealHypePage() {
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
