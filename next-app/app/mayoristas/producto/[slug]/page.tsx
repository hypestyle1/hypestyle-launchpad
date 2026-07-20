import { notFound } from 'next/navigation';
import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaProductDetail from '@/components/mayorista/MayoristaProductDetail';
import { fetchMayoristaProduct } from '@/lib/mayorista-products';

export default async function MayoristaProductPage({ params }: { params: { slug: string } }) {
  const product = await fetchMayoristaProduct(params.slug);
  if (!product) notFound();

  return (
    <>
      <MayoristaHeader />
      <MayoristaProductDetail product={product} />
    </>
  );
}
