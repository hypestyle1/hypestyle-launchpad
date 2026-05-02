'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphQL } from '@/lib/graphql-client';
import { PRODUCTS } from '@/data/products';

const GET_PRODUCTS = `
  query GetProducts($first: Int) {
    products(first: $first, where: { status: "publish", orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        name
        slug
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
          variations(first: 20) {
            nodes {
              stockStatus
              stockQuantity
              attributes { nodes { name value } }
            }
          }
        }
      }
    }
  }
`;

export interface NormalizedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  href: string;
  sizes: string[];
  stock: Record<string, 'ok' | 'low' | 'out'>;
}

function parsePrice(s?: string | null): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

function stockStatus(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 3) return 'low';
  return 'ok';
}

function fromWPNode(node: any): NormalizedProduct {
  const regular = parsePrice(node.regularPrice || node.price);
  const sale = parsePrice(node.salePrice);
  const price = (sale > 0 && sale < regular) ? sale : regular;
  const originalPrice = (sale > 0 && sale < regular) ? regular : undefined;

  const images: string[] = [];
  if (node.image?.sourceUrl) images.push(node.image.sourceUrl);
  (node.galleryImages?.nodes || []).forEach((g: any) => {
    if (g.sourceUrl && !images.includes(g.sourceUrl)) images.push(g.sourceUrl);
  });
  if (!images.length) images.push('');

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const variations: any[] = node.variations?.nodes ?? [];

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

  return {
    id: node.slug,
    name: node.name,
    slug: node.slug,
    category: node.productCategories?.nodes?.[0]?.name ?? '',
    price,
    originalPrice,
    image: images[0],
    images,
    href: `/producto/${node.slug}/`,
    sizes,
    stock,
  };
}

function staticFallback(first: number, category?: string): NormalizedProduct[] {
  const list = category
    ? PRODUCTS.filter(p => p.category.toLowerCase() === category.toLowerCase())
    : PRODUCTS;
  return list.slice(0, first).map(p => ({
    id: p.slug,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.images[0] ?? '',
    images: p.images,
    href: `/producto/${p.slug}/`,
    sizes: p.sizes,
    stock: p.stock,
  }));
}

export function useProducts(first = 20, category?: string) {
  return useQuery<NormalizedProduct[]>({
    queryKey: ['products', first, category],
    staleTime: 2 * 60 * 1000,
    initialData: () => staticFallback(first, category),
    initialDataUpdatedAt: Date.now(),
    queryFn: async (): Promise<NormalizedProduct[]> => {
      try {
        const data = await fetchGraphQL<{ products: { nodes: any[] } }>(GET_PRODUCTS, { first });
        const nodes = data?.products?.nodes ?? [];
        if (!nodes.length) return staticFallback(first, category);
        const all = nodes.map(fromWPNode);
        return category
          ? all.filter(p => p.category.toLowerCase() === category.toLowerCase())
          : all;
      } catch {
        return staticFallback(first, category);
      }
    },
  });
}
