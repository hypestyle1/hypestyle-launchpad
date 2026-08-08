import NewInPage from './PageClient';
import JsonLd from '@/components/JsonLd';
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

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'New In', path: PATH }]),
        ]}
      />
      <NewInPage />
    </>
  );
}
