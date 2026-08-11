import Worldwide from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { SHIPPING_FAQS } from '@/lib/worldwide';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/worldwide/';
const TITLE = 'Envíos a todo el mundo';
const DESCRIPTION =
  'HYPESTYLE envía a todo el mundo. Consultá costos, plazos de entrega y países de destino.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Envíos a todo el mundo', path: PATH }]),
          faqJsonLd(SHIPPING_FAQS),
        ]}
      />
      <Worldwide />
    </>
  );
}
