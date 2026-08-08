import Politicas from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/politicas-de-devolucion/';
const TITLE = 'Políticas de devolución';
const DESCRIPTION =
  'Cómo cambiar o devolver una prenda de HYPESTYLE: plazos, condiciones y los pasos a seguir.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Políticas de devolución', path: PATH }]),
        ]}
      />
      <Politicas />
    </>
  );
}
