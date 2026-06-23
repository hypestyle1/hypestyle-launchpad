import { fetchProductSlugs } from '@/lib/wp-products';
import ProductoClient from './ProductoClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchProductSlugs();
  return slugs.map(slug => ({ slug }));
}

export default function ProductoPage({ params }: { params: { slug: string } }) {
  return <ProductoClient slug={params.slug} />;
}
