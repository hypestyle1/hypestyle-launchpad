import Nosotros from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/nosotros/';
const TITLE = 'Nosotros';
const DESCRIPTION =
  'Empezamos en 2018 como una apuesta personal. Streetwear con identidad, cultura y concepto, hecho en Buenos Aires. Quiénes somos y cómo pensamos.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Nosotros', path: PATH }]),
        ]}
      />
      <Nosotros />
    </>
  );
}
