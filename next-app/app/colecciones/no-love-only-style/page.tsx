'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";

const config: CollectionConfig = {
  title: 'No Love, Only Style',
  subtitle: 'Drop 01 — 2025',
  groups: [
    { label: 'Remeras & Tops', slugs: ['baby-come-back-tees', 'no-love-only-style-tops'] },
    { label: 'Accesorios', slugs: ['trucker-cap-baby-come-back'] },
  ],
};

export default function NoLoveOnlyStylePage() {
  return <CollectionGroupedPage config={config} />;
}
