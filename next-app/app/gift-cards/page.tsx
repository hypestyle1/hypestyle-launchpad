import GiftCardsClient from './PageClient';
import JsonLd from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/jsonld';

const PATH = '/gift-cards/';
const TITLE = 'Gift cards';
const DESCRIPTION =
  'Regalá crédito para usar en HYPESTYLE. Tres montos, el código llega por mail y lo usa quien vos quieras, cuando quiera.';

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

export default function Page() {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd([{ name: 'Gift cards', path: PATH }])]} />
      <GiftCardsClient />
    </>
  );
}
