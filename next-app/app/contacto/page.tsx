import Contacto from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/contacto/';
const TITLE = 'Contacto';
const DESCRIPTION =
  'Escribinos por cualquier consulta sobre tu pedido, talles o cambios. Respondemos por WhatsApp e Instagram.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Contacto', path: PATH }]),
        ]}
      />
      <Contacto />
    </>
  );
}
