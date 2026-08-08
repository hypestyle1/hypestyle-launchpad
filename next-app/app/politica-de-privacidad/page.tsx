import PoliticaDePrivacidad from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/politica-de-privacidad/';
const TITLE = 'Política de privacidad';
const DESCRIPTION =
  'Cómo HYPESTYLE trata tus datos personales: qué guardamos, para qué los usamos y cuáles son tus derechos.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Política de privacidad', path: PATH }]),
        ]}
      />
      <PoliticaDePrivacidad />
    </>
  );
}
