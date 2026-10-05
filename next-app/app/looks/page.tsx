import LooksPage from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { fetchAllProducts } from '@/lib/products-server';

// La página es un client component (hooks de estado y de datos), así que no
// puede exportar metadata. Este wrapper server le pone el <title>, la meta
// description, el canonical propio y el structured data.
const PATH = '/looks/';
const TITLE = 'Shop The Look';
const DESCRIPTION =
  'Looks completos armados por HYPESTYLE. Copiá el outfit entero: remeras, longsleeves, hoodies y pantalones combinados.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

// Mismo prefetch que el home: el line-up sale con precios desde el primer
// render, sin esperar al fetch del browser.
export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: ['products'], queryFn: fetchAllProducts });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Shop The Look', path: PATH }]),
        ]}
      />
      <LooksPage />
    </HydrationBoundary>
  );
}
