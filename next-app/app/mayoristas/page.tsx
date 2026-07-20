import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaCatalog from '@/components/mayorista/MayoristaCatalog';
import { fetchMayoristaProducts } from '@/lib/mayorista-products';

export default async function MayoristasPage() {
  const products = await fetchMayoristaProducts();

  return (
    <>
      <MayoristaHeader />
      <MayoristaCatalog products={products} />
    </>
  );
}
