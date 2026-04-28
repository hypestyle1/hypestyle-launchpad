import { Suspense } from 'react';
import { PRODUCTS } from '@/data/products';
import PersonalizarClient from './PersonalizarClient';

export async function generateStaticParams() {
  return PRODUCTS.filter(p => p.customizable).map(p => ({ slug: p.slug }));
}

export default function PersonalizarPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense>
      <PersonalizarClient slug={params.slug} />
    </Suspense>
  );
}
