import ReviewsPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/reviews/';
const TITLE = 'Reviews de la comunidad';
const DESCRIPTION =
  'Lo que dice la comunidad de HYPESTYLE. Reseñas reales de clientes con fotos de las prendas.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Reviews de la comunidad', path: PATH }]),
        ]}
      />
      <ReviewsPage />
    </>
  );
}
