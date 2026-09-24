import { notFound } from 'next/navigation';
import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaProductDetail from '@/components/mayorista/MayoristaProductDetail';
import { fetchMayoristaProduct } from '@/lib/mayorista-products';
import { decorateCatalog } from '@/lib/mayorista-campaign-view';
import { loadCampaignsForPortal } from '@/lib/mayorista-campaigns-portal';

export const dynamic = 'force-dynamic';

export default async function MayoristaProductPage({ params, searchParams }: { params: { slug: string }; searchParams?: { preview?: string } }) {
  const [product, campaigns] = await Promise.all([fetchMayoristaProduct(params.slug), loadCampaignsForPortal(searchParams?.preview)]);
  if (!product) notFound();
  const [decorated] = decorateCatalog([product], campaigns);

  return (
    <>
      <MayoristaHeader />
      <MayoristaProductDetail product={decorated} />
    </>
  );
}
