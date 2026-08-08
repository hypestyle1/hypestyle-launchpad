import NovedadesPage from './PageClient';
import JsonLd from '@/components/JsonLd';
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

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Novedades', path: PATH }]),
        ]}
      />
      <NovedadesPage />
    </>
  );
}
