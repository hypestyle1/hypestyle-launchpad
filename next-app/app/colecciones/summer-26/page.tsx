'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

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

export default function Summer26Page() {
  return <CollectionGroupedPage config={config} />;
}
