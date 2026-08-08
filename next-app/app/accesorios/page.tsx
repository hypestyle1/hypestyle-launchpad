import CategoriaPage from '@/components/CategoriaPage';
import JsonLd from '@/components/JsonLd';
import { getCategoryConfig } from '@/lib/category-config';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const PATH = '/accesorios/';
const config = getCategoryConfig(PATH)!;

export const metadata = buildMetadata({
  title: config.title,
  description: config.seoDescription,
  path: PATH,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: config.title, description: config.seoDescription, path: PATH }),
          breadcrumbJsonLd([{ name: config.title, path: PATH }]),
        ]}
      />
      <CategoriaPage />
    </>
  );
}
