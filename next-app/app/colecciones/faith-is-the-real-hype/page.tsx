'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

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

export default function FaithIsTheRealHypePage() {
  return <CollectionGroupedPage config={config} />;
}
