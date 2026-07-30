'use client';

import CollectionGroupedPage, { CollectionConfig } from "@/components/CollectionGroupedPage";
import { REGULAR_TEES_GROUPS } from "@/lib/regular-tees";

const config: CollectionConfig = {
  title: 'Regular Tees',
  subtitle: 'Básicos premium — 100% algodón',
  groups: REGULAR_TEES_GROUPS,
};

export default function RegularTeesPage() {
  return <CollectionGroupedPage config={config} />;
}
