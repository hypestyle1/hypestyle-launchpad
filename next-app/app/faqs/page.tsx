import FAQs from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/faqs/';
const TITLE = 'Preguntas frecuentes';
const DESCRIPTION =
  'Envíos, cambios, talles y medios de pago: todo lo que necesitás saber antes de comprar en HYPESTYLE.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Preguntas frecuentes', path: PATH }]),
        ]}
      />
      <FAQs />
    </>
  );
}
