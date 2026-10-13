import FW26Page from './PageClient';
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { FW26_SLUGS } from '@/lib/fw26';
import { breadcrumbJsonLd, collectionJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/colecciones/fw26';
const TITLE = 'FW26';
const DESCRIPTION =
  'Colección FW26 de HYPESTYLE: Grey HStars, Half-Zip Polos y Pink Set Drop. La temporada Fall/Winter 2026 completa.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page() {
  const initialProducts = await initialProductsBySlugs(FW26_SLUGS);
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: TITLE, description: DESCRIPTION, path: PATH }),
          breadcrumbJsonLd([{ name: 'Colecciones', path: '/colecciones/' }, { name: 'FW26', path: PATH }]),
        ]}
      />
      <FW26Page initialProducts={initialProducts} />
    </>
  );
}
