import { PRODUCTS } from '@/data/products';
import ProductoClient from './ProductoClient';

export async function generateStaticParams() {
  return PRODUCTS.map(p => ({ slug: p.slug }));
}

export default function ProductoPage({ params }: { params: { slug: string } }) {
  return <ProductoClient slug={params.slug} />;
}
