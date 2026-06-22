import { fetchProductSlugs } from '@/lib/wp-products';
import { getCachedDiscountStatus } from '@/lib/goal-discount';
import ProductoClient from './ProductoClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

export default async function ProductoPage({ params }: { params: { slug: string } }) {
  const initialGoalDiscount = await getCachedDiscountStatus().catch(() => null);
  return <ProductoClient slug={params.slug} initialGoalDiscount={initialGoalDiscount} />;
}
