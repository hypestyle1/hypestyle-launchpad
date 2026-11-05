import { notFound } from 'next/navigation';
import CollectionGroupedPage, { CollectionConfig } from '@/components/CollectionGroupedPage';
import JsonLd from '@/components/JsonLd';
import { initialProductsBySlugs } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import { collectionJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { CAMO_PREVENTA_LANZAMIENTO } from '@/lib/preventa-productos';

/* CAMO DROP (preventa, drop 02 de Cyber Hype) — destino del CTA
   "Ver colección" de Los drops. Reúne las cuatro prendas: Zip Hoodie y Jort,
   en Olive y Brown. Distinta de /colecciones/camo-set-drop (el set FW26).

   No existe antes del lanzamiento: hasta CAMO_PREVENTA_LANZAMIENTO responde
   404, así un merge anticipado no deja una página de preventa a la vista.
   Solo muestra productos PUBLICADOS en Woo (lib/catalog). */

const config: CollectionConfig = {
  title: 'Camo Drop',
  subtitle: 'Preventa · Entrega estimada a partir del viernes 13 de noviembre de 2026',
  groups: [
    { label: 'Zip Hoodie', slugs: ['zip-hoodie-camo-olive', 'zip-hoodie-camo'] },
    { label: 'Jort', slugs: ['jort-camo-olive', 'jort-camo-brown'] },
  ],
  foto: { src: '/colecciones/camo-drop/zip-camo-chocolate-piso.webp', alt: 'Zip Hoodie Camo Chocolate sobre piso de hormigón' },
};

const PATH = '/colecciones/camo-drop';
const SEO_DESCRIPTION = 'Camo Drop en preventa: Zip Hoodie y Jort en Olive y Brown. Entrega estimada a partir del 13/11.';

export const metadata = buildMetadata({ title: config.title, description: SEO_DESCRIPTION, path: PATH });

export const revalidate = 60;

export default async function CamoDropPage() {
  if (Date.now() < new Date(CAMO_PREVENTA_LANZAMIENTO).getTime()) notFound();
  const initialProducts = await initialProductsBySlugs(config.groups.flatMap((g) => g.slugs));
  return (
    <>
      <JsonLd
        data={[
          collectionJsonLd({ name: config.title, description: SEO_DESCRIPTION, path: PATH }),
          breadcrumbJsonLd([
            { name: 'Colecciones', path: '/colecciones/' },
            { name: config.title, path: PATH },
          ]),
        ]}
      />
      <CollectionGroupedPage config={config} initialProducts={initialProducts} />
    </>
  );
}
