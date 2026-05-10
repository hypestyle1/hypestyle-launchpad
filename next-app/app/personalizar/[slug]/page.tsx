import { Suspense } from 'react';
import { fetchProductSlugs } from '@/lib/wp-products';
import PersonalizarClient from './PersonalizarClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

export default function PersonalizarPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense>
      <PersonalizarClient slug={params.slug} />
    </Suspense>
  );
}
