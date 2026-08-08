import type { Product } from '@/data/products';
import { SITE_URL, SITE_NAME, canonicalUrl, truncate } from './seo';

/**
 * Structured data (schema.org / JSON-LD).
 *
 * Es lo que habilita los rich results de Google: precio, disponibilidad y
 * migas de pan directamente en el resultado de búsqueda. Antes el sitio no
 * emitía ni un solo bloque `application/ld+json`.
 *
 * Validar cambios con el Rich Results Test:
 * https://search.google.com/test/rich-results
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: 'Hypestyle',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo-hypestyle-2026.png`,
    image: `${SITE_URL}/og-image.png`,
    description:
      'Marca argentina de streetwear fundada en 2018. Diseñamos prendas inspiradas en la cultura, la identidad y el estilo contemporáneo.',
    foundingDate: '2018',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Buenos Aires',
      addressCountry: 'AR',
    },
    sameAs: ['https://instagram.com/hypestylearg'],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: 'es-AR',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** Migas de pan. `trail` va desde la raíz hasta la página actual, sin incluir "Inicio". */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
      ...trail.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.name,
        item: canonicalUrl(item.path),
      })),
    ],
  };
}

/**
 * Product + Offer. Google exige `price` y `priceCurrency` para mostrar el
 * precio en el resultado; sin `availability` no marca el estado de stock.
 */
export function productJsonLd(product: Product) {
  const url = canonicalUrl(`/producto/${product.slug}/`);
  const images = product.images.filter(Boolean).map(img =>
    img.startsWith('http') ? img : `${SITE_URL}/${img.replace(/^\/+/, '')}`
  );
  // "out" en todos los talles = sin stock. Si hay al menos uno disponible, InStock.
  const anyInStock = product.sizes.some(size => product.stock[size] !== 'out');

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: truncate(product.description || product.name, 300),
    sku: product.slug,
    category: product.category,
    ...(images.length ? { image: images } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'ARS',
      availability: anyInStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORGANIZATION_ID },
    },
  };
}

/** Listado de productos de una colección o categoría. */
export function collectionJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  products?: { name: string; slug: string }[];
}) {
  const url = canonicalUrl(opts.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: opts.name,
    description: truncate(opts.description),
    url,
    isPartOf: { '@id': WEBSITE_ID },
    ...(opts.products?.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: opts.products.length,
            itemListElement: opts.products.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: p.name,
              url: canonicalUrl(`/producto/${p.slug}/`),
            })),
          },
        }
      : {}),
  };
}
