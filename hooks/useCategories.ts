'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchGraphQL } from '@/lib/graphql-client';

const GET_CATEGORIES = `
  query GetCategories {
    productCategories(where: { hideEmpty: false }) {
      nodes {
        id
        name
        slug
        count
        image { sourceUrl altText }
      }
    }
  }
`;

const STATIC_CATEGORIES = [
  { name: 'Tees',       slug: 'tees' },
  { name: 'Hoodies',    slug: 'hoodies' },
  { name: 'Jorts',      slug: 'jorts' },
  { name: 'Accesorios', slug: 'accesorios' },
  { name: 'Sets',       slug: 'sets' },
  { name: 'Crewnecks',  slug: 'crewnecks' },
  { name: 'Sleeveless', slug: 'sleeveless' },
  { name: 'Sweatpants', slug: 'sweatpants' },
];

const STATIC_FALLBACK = { productCategories: { nodes: STATIC_CATEGORIES, _source: 'static' as const } };

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const data = await fetchGraphQL<{ productCategories: { nodes: any[] } }>(GET_CATEGORIES);
        if (!data?.productCategories?.nodes?.length) return STATIC_FALLBACK;
        return data;
      } catch {
        return STATIC_FALLBACK;
      }
    },
  });
}
