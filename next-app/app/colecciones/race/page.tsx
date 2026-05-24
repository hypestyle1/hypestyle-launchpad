'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

const config: CollectionConfig = {
  title: 'Race',
  subtitle: 'Motorsport · Estética vintage racing',
  groups: [
    { label: 'Hoodie', slugs: ['no-service-for-the-faithless-hoodie'] },
    { label: 'Remeras', slugs: ['race-tee', 'no-service-for-the-faithless-tees'] },
  ],
};

export default function RacePage() {
  return <CollectionGroupedPage config={config} />;
}
