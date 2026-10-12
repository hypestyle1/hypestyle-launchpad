import NovedadesPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { fetchCatalogForSsr } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/novedades/';
const TITLE = 'Novedades';
const DESCRIPTION =
  'Las últimas incorporaciones al catálogo de HYPESTYLE. Drops nuevos, restocks y piezas de temporada.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page() {
  const initialProducts = (await fetchCatalogForSsr()).slice(0, 8);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Novedades', path: PATH }]),
        ]}
      />
      <NovedadesPage initialProducts={initialProducts} />
    </>
  );
}
