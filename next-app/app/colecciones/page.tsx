import Colecciones from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd, collectionJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/colecciones/';
const TITLE = 'Colecciones';
const DESCRIPTION =
  'Todos los drops de HYPESTYLE: Faith Is The Real Hype, FW26, Summer 26, Camo Set Drop, Race y más. Producción limitada.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: TITLE, description: DESCRIPTION, path: PATH }),
          breadcrumbJsonLd([{ name: 'Colecciones', path: PATH }]),
        ]}
      />
      <Colecciones />
    </>
  );
}
