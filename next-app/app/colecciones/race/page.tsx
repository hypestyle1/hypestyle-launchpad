'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

const config: CollectionConfig = {
  title: 'Race',
  subtitle: 'Motorsport · Estética vintage racing',
  groups: [
    { label: 'Hoodie', slugs: ['no-service-for-the-faithless-hoodie'] },
    { label: 'Remeras', slugs: ['race-tee', 'race-tee-gris', 'no-service-for-the-faithless-white', 'no-service-for-the-faithless-black', 'no-service-for-the-faithless-grey', 'no-service-for-the-faithless-green'] },
  ],
};

export default function RacePage() {
  return <CollectionGroupedPage config={config} />;
}
