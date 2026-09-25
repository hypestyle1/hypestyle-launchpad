import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaCartPage from '@/components/mayorista/MayoristaCartPage';
import { fetchMayoristaProducts } from '@/lib/mayorista-products';
import { loadCampaignsForPortal } from '@/lib/mayorista-campaigns-portal';
import { decorateCatalog, campaignBanner } from '@/lib/mayorista-campaign-view';

// El carrito recibe el catálogo decorado con la campaña vigente para
// "Completá el mínimo" (sugerencias) y el nombre de la campaña para la línea
// de descuento. Los precios cobrados los decide el servidor al confirmar.
export const dynamic = 'force-dynamic';

export default async function MayoristaCarritoPage({ searchParams }: { searchParams?: { preview?: string } }) {
  const [products, campaigns] = await Promise.all([fetchMayoristaProducts().catch(() => []), loadCampaignsForPortal(searchParams?.preview)]);
  const catalog = decorateCatalog(products, campaigns);
  const banner = campaignBanner(products, campaigns);

  return (
    <>
      <MayoristaHeader />
      <MayoristaCartPage catalog={catalog} campaignName={banner?.name ?? null} />
    </>
  );
}
