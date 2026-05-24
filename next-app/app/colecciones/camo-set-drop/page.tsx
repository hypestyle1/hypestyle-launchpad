'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

const config: CollectionConfig = {
  title: 'Camo Set Drop',
  subtitle: 'Set completo en camo print',
  headerImage: '/fw26-camo-editorial.jpg',
  groups: [
    { label: 'Conjunto', slugs: ['camo-full-set-combo', 'zip-hoodie-camo', 'sweatpant-camo'] },
    { label: 'Accesorios', slugs: ['camo-cap', 'beanie-camo'] },
  ],
};

export default function CamoSetDropPage() {
  return <CollectionGroupedPage config={config} />;
}
