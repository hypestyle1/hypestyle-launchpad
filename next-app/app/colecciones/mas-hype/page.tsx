'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import { MAS_HYPE_GROUPS } from "@/lib/mas-hype";

const config: CollectionConfig = {
  title: 'Más Hype',
  subtitle: 'El resto del catálogo — piezas únicas, colabs y clásicos',
  groups: MAS_HYPE_GROUPS,
};

export default function MasHypePage() {
  return <CollectionGroupedPage config={config} />;
}
