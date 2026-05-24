'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

const config: CollectionConfig = {
  title: 'Regular Tees',
  subtitle: 'Básicos premium — 100% algodón',
  groups: [
    { label: 'Individuales', slugs: ['regular-tee-white', 'regular-tee-melange'] },
    { label: '3-Packs', slugs: ['regular-tees-3-pack-white', 'regular-tees-3-pack-black', 'regular-tees-3-pack-grey', 'regular-tees-3-pack-black-white-melange'] },
  ],
};

export default function RegularTeesPage() {
  return <CollectionGroupedPage config={config} />;
}
