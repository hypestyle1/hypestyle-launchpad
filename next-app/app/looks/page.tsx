import LooksPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/looks/';
const TITLE = 'Shop The Look';
const DESCRIPTION =
  'Looks completos armados por HYPESTYLE. Copiá el outfit entero: hoodie, pantalón y accesorios combinados.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Shop The Look', path: PATH }]),
        ]}
      />
      <LooksPage />
    </>
  );
}
