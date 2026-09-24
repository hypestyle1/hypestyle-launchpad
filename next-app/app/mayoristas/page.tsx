import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaCatalog from '@/components/mayorista/MayoristaCatalog';
import { fetchMayoristaProducts } from '@/lib/mayorista-products';
import { loadCampaignsForPortal } from '@/lib/mayorista-campaigns-portal';
import { decorateCatalog, campaignBanner } from '@/lib/mayorista-campaign-view';

// El catálogo se decora con la campaña vigente en el servidor (misma lib que
// usa el pedido). ?preview=<token> ve una campaña en borrador (ver
// lib/mayorista-campaigns-portal.ts).
export const dynamic = 'force-dynamic';

export default async function MayoristasPage({ searchParams }: { searchParams?: { preview?: string } }) {
  const [products, campaigns] = await Promise.all([fetchMayoristaProducts(), loadCampaignsForPortal(searchParams?.preview)]);
  const decorated = decorateCatalog(products, campaigns);
  const banner = campaignBanner(products, campaigns);
  const preview = !!searchParams?.preview && !!banner;

  return (
    <>
      <MayoristaHeader />
      <MayoristaCatalog products={decorated} banner={banner} preview={preview} />
    </>
  );
}
