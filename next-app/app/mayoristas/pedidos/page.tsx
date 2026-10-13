import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import MayoristaPedidos from '@/components/mayorista/MayoristaPedidos';
import { fetchMayoristaProducts } from '@/lib/mayorista-products';
import { loadCampaignsForPortal } from '@/lib/mayorista-campaigns-portal';
import { decorateCatalog } from '@/lib/mayorista-campaign-view';
import { fetchMayoristaDrop } from '@/lib/mayorista-drop-server';

// El catálogo de hoy (con la campaña vigente) se pasa para "Volver a pedir":
// la orden vieja se vuelve a armar con los precios y el stock actuales.
export const dynamic = 'force-dynamic';

export default async function MayoristaPedidosPage() {
  const drop = await fetchMayoristaDrop().catch(() => null);
  const [products, campaigns] = await Promise.all([fetchMayoristaProducts(drop).catch(() => []), loadCampaignsForPortal()]);
  const catalog = decorateCatalog(products, campaigns);

  return (
    <>
      <MayoristaHeader />
      <MayoristaPedidos catalog={catalog} />
    </>
  );
}
