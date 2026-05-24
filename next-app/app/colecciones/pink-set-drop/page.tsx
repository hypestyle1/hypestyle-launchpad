'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

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

export default function PinkSetDropPage() {
  return <CollectionGroupedPage config={config} />;
}
