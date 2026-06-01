'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphQL } from '@/lib/graphql-client';
import { type Product } from '@/data/products';
import { CUSTOMIZABLE_SLUGS } from '@/lib/customizable';

const GET_PRODUCT = `
  query GetProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      name
      slug
      description
      shortDescription
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
        stockStatus
        stockQuantity
        image { sourceUrl }
        galleryImages { nodes { sourceUrl } }
        productCategories { nodes { name } }
        attributes { nodes { name options } }
      }
      ... on VariableProduct {
        price
        regularPrice
        image { sourceUrl }
        galleryImages { nodes { sourceUrl } }
        productCategories { nodes { name } }
        attributes { nodes { name options } }
        variations(first: 100) {
          nodes {
            stockStatus
            stockQuantity
            attributes { nodes { name value } }
          }
        }
      }
    }
  }
`;

const CARE_APPAREL = [
  { icon: 'wash',     text: 'Lavar a mano o a máquina en agua fría (máx. 30°C)' },
  { icon: 'no-dryer', text: 'No usar secadora' },
  { icon: 'iron-low', text: 'Planchar a temperatura baja, sin vapor' },
  { icon: 'no-dry',   text: 'No lavar en seco' },
];

const CARE_ACCESSORY = [
  { icon: 'no-dryer', text: 'Limpiar con paño húmedo, no sumergir en agua' },
  { icon: 'no-dry',   text: 'Guardar en lugar fresco y seco' },
];

const COLOR_HEX: Record<string, string> = {
  negro: '#1a1a1a', black: '#1a1a1a',
  blanco: '#f5f5f5', white: '#f5f5f5',
  gris: '#888888', grey: '#888888', graphite: '#4a4a4a',
  melange: '#b8b4ae', sand: '#c8a96e',
  crudo: '#e8e0d0', cream: '#e8e0d0', natural: '#c8b89a',
  beige: '#c4aa87', taupe: '#8b7355',
  camo: '#6b7c5c', militar: '#2F3D28', olive: '#6b7440',
  rosa: '#e88ea0', pink: '#e88ea0',
  bordo: '#6b1a2a', burdeos: '#6b1a2a',
  orange: '#c87941', silver: '#c0c0c0', blue: '#3a6ea8',
  realtree: '#5a6b42', wheat: '#c8a96e', earth: '#7b5a3c', brown: '#7b5a3c',
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'Única'];

const HALF_ZIP_COLORWAYS = [
  { label: 'Navy',    value: '#1a2744', slug: 'half-zip-polo-navy',    image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-6-1.png' },
  { label: 'Melange', value: '#b8b4ae', slug: 'half-zip-polo-melange', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-2-1.png' },
  { label: 'Black',   value: '#1a1a1a', slug: 'half-zip-polo-black',   image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-1.png' },
];

const RACE_TEE_COLORWAYS = [
  { label: 'Verde', value: '#4a5c2e', slug: 'race-tee',      image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/racing-tee-verde-_-frente1-88b3eeeabd65c4f79917752459630095-1024-1024.png' },
  { label: 'Gris',  value: '#808080', slug: 'race-tee-gris', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/racing-tee-g-_-frente1-809aeca8ef8ac9703f17752459918651-640-0-d36f3ddcd2565fe20817752747475247-1024-1024.webp' },
];

const NO_SERVICE_COLORWAYS = [
  { label: 'White', value: '#f5f5f5', slug: 'no-service-for-the-faithless-white', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/racing-tees-1-c7f74657e013e491c017739458566697-1024-1024-5cdeca07c1f0022d2017752750197776-1024-1024.webp' },
  { label: 'Black', value: '#1a1a1a', slug: 'no-service-for-the-faithless-black', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/faithless-tee-7-fe9cdee514608705da17739414718987-1024-1024-7de40fc420b6f5fd8517752750048245-1024-1024.webp' },
  { label: 'Grey',  value: '#888888', slug: 'no-service-for-the-faithless-grey',  image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/faithless-tee-4-e559cabcab8bd2791317739414254597-1024-1024.png' },
  { label: 'Green', value: '#4a5c2e', slug: 'no-service-for-the-faithless-green', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/racing-tees-1-c7f74657e013e491c017739458566697-1024-1024-5cdeca07c1f0022d2017752750197776-1024-1024.webp' },
];

const BABY_COME_BACK_COLORWAYS = [
  { label: 'White', value: '#f5f5f5', slug: 'baby-come-back-tees',  image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/mesa-de-trabajo-3-c14b1f4b5c87b4512e17708515886120-1024-1024.png' },
  { label: 'Black', value: '#1a1a1a', slug: 'baby-come-back-black', image: 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/mesa-de-trabajo-3-fbffee6d9870b660fe17714294583297-1024-1024.jpg' },
];

const COLORWAYS: Record<string, typeof HALF_ZIP_COLORWAYS> = {
  'half-zip-polo-navy':    HALF_ZIP_COLORWAYS,
  'half-zip-polo-melange': HALF_ZIP_COLORWAYS,
  'half-zip-polo-black':   HALF_ZIP_COLORWAYS,
  'race-tee':              RACE_TEE_COLORWAYS,
  'race-tee-gris':         RACE_TEE_COLORWAYS,
  'no-service-for-the-faithless-white': NO_SERVICE_COLORWAYS,
  'no-service-for-the-faithless-black': NO_SERVICE_COLORWAYS,
  'no-service-for-the-faithless-grey':  NO_SERVICE_COLORWAYS,
  'no-service-for-the-faithless-green': NO_SERVICE_COLORWAYS,
  'baby-come-back-tees':  BABY_COME_BACK_COLORWAYS,
  'baby-come-back-black': BABY_COME_BACK_COLORWAYS,
};

const FIT_KEYWORDS: [string, string][] = [
  ['boxy oversized', 'Boxy Oversized'], ['boxy fit', 'Boxy Fit'],
  ['oversized', 'Oversized'], ['jogger', 'Jogger Fit'],
  ['slim fit', 'Slim Fit'], ['regular fit', 'Regular Fit'],
  ['cargo fit', 'Cargo Fit'], ['talle único', 'Talle único'],
];

const FIT_BY_CATEGORY: Record<string, string> = {
  Hoodie: 'Boxy Oversized', Campera: 'Boxy Oversized', Sweater: 'Regular Fit',
  Remera: 'Regular Fit', Musculosa: 'Regular Fit',
  'Pantalón': 'Jogger Fit', Short: 'Regular Fit',
  Accesorio: 'Talle único', Set: 'Boxy Oversized',
};

function parsePrice(s?: string | null): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '')
    .replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&oacute;/g, 'ó').replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ').replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function stockStatus(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 3) return 'low';
  return 'ok';
}

function guessColor(name: string): { label: string; value: string } {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [kw, hex] of Object.entries(COLOR_HEX)) {
    if (n.includes(kw)) return { label: kw.charAt(0).toUpperCase() + kw.slice(1), value: hex };
  }
  return { label: 'Default', value: '#111111' };
}

function extractFit(desc: string, category: string): string {
  const d = desc.toLowerCase();
  for (const [kw, label] of FIT_KEYWORDS) {
    if (d.includes(kw)) return label;
  }
  return FIT_BY_CATEGORY[category] || 'Regular Fit';
}

function fromWPNode(node: any): Product {
  const name     = (node.name || '').trim();
  const slug     = node.slug || '';
  const category = node.productCategories?.nodes?.[0]?.name || 'Remera';
  const description = stripHtml(node.description || '');
  const modelInfo   = stripHtml(node.shortDescription || '') || undefined;

  const regular  = parsePrice(node.regularPrice);
  const explicit = parsePrice(node.salePrice);
  const current  = parsePrice(node.price);
  const active   = explicit > 0 ? explicit : current;
  const price    = active > 0 ? active : regular;
  const originalPrice = (price > 0 && price < regular) ? regular : undefined;

  const allImages: string[] = [];
  if (node.image?.sourceUrl) allImages.push(node.image.sourceUrl);
  (node.galleryImages?.nodes || []).forEach((g: any) => {
    if (g.sourceUrl && !allImages.includes(g.sourceUrl)) allImages.push(g.sourceUrl);
  });
  if (!allImages.length) allImages.push('');

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const variations: any[] = node.variations?.nodes || [];
  let variantAxis = ''; // nombre del atributo de variación: talle/size o color

  if (variations.length) {
    for (const v of variations) {
      const attr = v.attributes?.nodes?.find((a: any) => {
        const n = (a.name || '').toLowerCase();
        return n === 'talle' || n === 'size' || n === 'pa_talle' || n === 'color' || n === 'pa_color';
      });
      if (attr && !variantAxis) variantAxis = (attr.name || '').toLowerCase();
      const sz = attr?.value?.trim() || 'Única';
      if (!sizes.includes(sz)) {
        sizes.push(sz);
        stock[sz] = stockStatus(v.stockStatus, v.stockQuantity ?? null);
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockStatus(node.stockStatus || 'IN_STOCK', node.stockQuantity ?? null);
  }
  // Cuando el eje de variación es el color (talle único), lo tratamos distinto en la UI.
  const colorVariant = variantAxis.includes('color');

  sizes.sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const color   = guessColor(name);
  const fitAttr = (node.attributes?.nodes ?? []).find(
    (a: any) => a.name?.toLowerCase() === 'fit'
  );
  const fit = fitAttr?.options?.[0]?.trim() || extractFit(description, category);

  const sizeGuideAttr = (node.attributes?.nodes ?? []).find(
    (a: any) => a.name?.toLowerCase() === 'size-guide' || a.name?.toLowerCase() === 'guia-talles'
  );
  const sizeGuideImage = sizeGuideAttr?.options?.[0]?.trim() || undefined;

  // Talle equivalente para productos de talle único (ej. "L"). Atributo opcional en Woo.
  const sizeEquivAttr = (node.attributes?.nodes ?? []).find(
    (a: any) => (a.name?.toLowerCase() ?? '').includes('equival')
  );
  const sizeEquivalent = sizeEquivAttr?.options?.[0]?.trim() || undefined;

  // Medidas de la prenda (talle único) — atributos opcionales en Woo: ancho/largo/manga.
  const attrVal = (name: string) => (node.attributes?.nodes ?? [])
    .find((a: any) => (a.name?.toLowerCase() ?? '') === name)?.options?.[0]?.trim() || undefined;
  const m = { ancho: attrVal('ancho'), largo: attrVal('largo'), manga: attrVal('manga') };
  const measurements = (m.ancho || m.largo || m.manga) ? m : undefined;

  const careItems = category === 'Accesorio' ? CARE_ACCESSORY : CARE_APPAREL;

  return {
    slug, id: slug, name, category, price, originalPrice,
    description, modelInfo, sizeGuideImage, sizeEquivalent, measurements, careItems, fit, sizes, stock,
    customizable: CUSTOMIZABLE_SLUGS.has(slug),
    colorVariant,
    colors: COLORWAYS[slug]?.map(c => ({
      label: c.label,
      value: c.value,
      image: c.image,
      slug: c.slug,
      href: `/producto/${c.slug}/`,
    })) ?? [{ label: color.label, value: color.value, image: allImages[0] }],
    images: allImages,
  };
}

// Para productos con colorways, la miniatura de cada swatch se toma de la foto
// destacada real de cada producto hermano en WooCommerce (no de URLs hardcodeadas
// en COLORWAYS), así siempre coincide con lo cargado en Woo y no se desincroniza.
async function resolveColorwayImages(product: Product): Promise<void> {
  const colors = product.colors;
  if (colors.length < 2 || colors.some(c => !c.slug)) return;
  const q = `query ColorwayImgs {\n` +
    colors.map((c, i) =>
      `s${i}: product(id: "${c.slug}", idType: SLUG) { ... on SimpleProduct { image { sourceUrl } } ... on VariableProduct { image { sourceUrl } } }`
    ).join('\n') + `\n}`;
  try {
    const res = await fetchGraphQL<Record<string, { image?: { sourceUrl?: string } } | null>>(q);
    product.colors = colors.map((c, i) => {
      const url = res?.[`s${i}`]?.image?.sourceUrl;
      return url ? { ...c, image: url } : c;
    });
  } catch {
    // fallback: se mantienen las imágenes de COLORWAYS
  }
}

export function useProduct(slug: string | undefined) {
  return useQuery<Product | undefined>({
    queryKey: ['product', slug],
    enabled: !!slug,
    staleTime: 0,
    queryFn: async (): Promise<Product | undefined> => {
      if (!slug) return undefined;
      const data = await fetchGraphQL<{ product: any }>(GET_PRODUCT, { slug });
      if (!data?.product) return undefined;
      const product = fromWPNode(data.product);
      await resolveColorwayImages(product);
      return product;
    },
  });
}
