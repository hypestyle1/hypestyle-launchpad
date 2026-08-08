import BackInStockPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/back-in-stock/';
const TITLE = 'Back In Stock';
const DESCRIPTION =
  'Volvieron los productos más pedidos de HYPESTYLE. Stock repuesto por tiempo limitado.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Back In Stock', path: PATH }]),
        ]}
      />
      <BackInStockPage />
    </>
  );
}
