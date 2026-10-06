import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaCatalog from '@/components/mayorista/MayoristaCatalog';
import MayoristaExclusividadBanner from '@/components/mayorista/MayoristaExclusividadBanner';
import { fetchMayoristaProducts } from '@/lib/mayorista-products';
import { loadCampaignsForPortal } from '@/lib/mayorista-campaigns-portal';
import { decorateCatalog, campaignBanner } from '@/lib/mayorista-campaign-view';
import { fetchMayoristaDrop } from '@/lib/mayorista-drop-server';

// El catálogo se decora con la campaña vigente en el servidor (misma lib que
// usa el pedido). ?preview=<token> ve una campaña en borrador (ver
// lib/mayorista-campaigns-portal.ts).
export const dynamic = 'force-dynamic';

export default async function MayoristasPage({ searchParams }: { searchParams?: { preview?: string } }) {
  // El drop nuevo (colección de Private Access) entra antes que al público:
  // ver lib/mayorista-drop.ts. Si falla, el catálogo sigue sin él.
  const drop = await fetchMayoristaDrop().catch(() => null);
  const [products, campaigns] = await Promise.all([fetchMayoristaProducts(drop), loadCampaignsForPortal(searchParams?.preview)]);
  const decorated = decorateCatalog(products, campaigns);
  const banner = campaignBanner(products, campaigns);
  const preview = !!searchParams?.preview && !!banner;
  const dropCount = decorated.filter(p => p.drop).length;
  const dropProps = drop?.highlighted && dropCount > 0 ? { ...drop.info, count: dropCount } : null;

  return (
    <>
      <MayoristaHeader />
      <MayoristaExclusividadBanner />
      <MayoristaCatalog products={decorated} banner={banner} preview={preview} drop={dropProps} />
    </>
  );
}
