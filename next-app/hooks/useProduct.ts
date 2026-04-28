'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphQL } from '@/lib/graphql-client';
import { PRODUCTS, type Product } from '@/data/products';

const GET_PRODUCT = `
  query GetProduct($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      id
      name
      slug
      description
      ... on SimpleProduct {
        price
        regularPrice
        salePrice
        stockStatus
        stockQuantity
        image { sourceUrl }
        galleryImages { nodes { sourceUrl } }
        productCategories { nodes { name } }
      }
      ... on VariableProduct {
        price
        regularPrice
        image { sourceUrl }
        galleryImages { nodes { sourceUrl } }
        productCategories { nodes { name } }
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

  const regular = parsePrice(node.regularPrice || node.price);
  const sale    = parsePrice(node.salePrice);
  const price   = (sale > 0 && sale < regular) ? sale : regular;
  const originalPrice = (sale > 0 && sale < regular) ? regular : undefined;

  const allImages: string[] = [];
  if (node.image?.sourceUrl) allImages.push(node.image.sourceUrl);
  (node.galleryImages?.nodes || []).forEach((g: any) => {
    if (g.sourceUrl && !allImages.includes(g.sourceUrl)) allImages.push(g.sourceUrl);
  });
  if (!allImages.length) allImages.push('');

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const variations: any[] = node.variations?.nodes || [];

  if (variations.length) {
    for (const v of variations) {
      const sizeAttr = v.attributes?.nodes?.find(
        (a: any) => a.name === 'talle' || a.name === 'Talle' || a.name === 'size',
      );
      const sz = sizeAttr?.value?.trim() || 'Única';
      if (!sizes.includes(sz)) {
        sizes.push(sz);
        stock[sz] = stockStatus(v.stockStatus, v.stockQuantity ?? null);
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockStatus(node.stockStatus || 'IN_STOCK', node.stockQuantity ?? null);
  }

  const color   = guessColor(name);
  const fit     = extractFit(description, category);
  const careItems = category === 'Accesorio' ? CARE_ACCESSORY : CARE_APPAREL;

  return {
    slug, id: slug, name, category, price, originalPrice,
    description, careItems, fit, sizes, stock,
    colors: [{ label: color.label, value: color.value, image: allImages[0] }],
    images: allImages,
  };
}

export function useProduct(slug: string | undefined) {
  const staticProduct = slug ? PRODUCTS.find(p => p.slug === slug) : undefined;

  return useQuery<Product | undefined>({
    queryKey: ['product', slug],
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
    initialData: staticProduct,
    initialDataUpdatedAt: Date.now(),
    queryFn: async (): Promise<Product | undefined> => {
      if (!slug) return undefined;
      try {
        const data = await fetchGraphQL<{ product: any }>(GET_PRODUCT, { slug });
        if (!data?.product) return staticProduct;
        return fromWPNode(data.product);
      } catch {
        return staticProduct;
      }
    },
  });
}
