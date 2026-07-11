import { Suspense } from 'react';
import { fetchProductSlugs } from '@/lib/wp-products';
import { getCachedDiscountStatus } from '@/lib/goal-discount';
import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';
import PersonalizarClient from './PersonalizarClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

export default async function PersonalizarPage({ params }: { params: { slug: string } }) {
  const initialGoalDiscount = params.slug === GOAL_DISCOUNT_SLUG
    ? await getCachedDiscountStatus().catch(() => null)
    : null;
  return (
    <Suspense>
      <PersonalizarClient slug={params.slug} initialGoalDiscount={initialGoalDiscount} />
    </Suspense>
  );
}
