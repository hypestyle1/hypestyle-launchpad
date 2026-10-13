import BackInStockPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { initialProductsByTag } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/back-in-stock';
const TITLE = 'Back In Stock';
const DESCRIPTION =
  'Volvieron los productos más pedidos de HYPESTYLE. Stock repuesto por tiempo limitado.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page() {
  const initialProducts = await initialProductsByTag('best-seller');
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Back In Stock', path: PATH }]),
        ]}
      />
      <BackInStockPage initialProducts={initialProducts} />
    </>
  );
}
