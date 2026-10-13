import NewInPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { initialProductsByTag } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/new-in/';
const TITLE = 'New In';
const DESCRIPTION =
  'Lo último que entró a HYPESTYLE: las novedades de la temporada, recién salidas del drop. Envíos a todo el mundo.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Las cards van en el HTML inicial (lib/catalog.ts), como en /special-prices.
// En el navegador manda igual el pedido a /api/products (stock y precio al día).
export const revalidate = 60;

export default async function Page() {
  const initialProducts = await initialProductsByTag('new-in');
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'New In', path: PATH }]),
        ]}
      />
      <NewInPage initialProducts={initialProducts} />
    </>
  );
}
