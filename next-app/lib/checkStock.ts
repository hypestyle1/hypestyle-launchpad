import { fetchGraphQL } from './graphql-client';

const CHECK_STOCK = `
  query CheckStock($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      ... on SimpleProduct {
        stockStatus
        stockQuantity
      }
      ... on VariableProduct {
        variations(first: 50) {
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

function stockLevel(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 0) return 'out';
  if (qty !== null && qty <= 3) return 'low';
  return 'ok';
}

export async function checkStock(slug: string, size: string): Promise<'ok' | 'low' | 'out'> {
  if (typeof window === 'undefined') return 'ok';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const data = await fetchGraphQL<{ product: any }>(CHECK_STOCK, { slug }, controller.signal);
    clearTimeout(timeout);
    const p = data?.product;
    if (!p) return 'ok';

    if (!p.variations) {
      return stockLevel(p.stockStatus ?? 'IN_STOCK', p.stockQuantity ?? null);
    }

    const needle = size.toLowerCase().trim();
    const variation = (p.variations.nodes as any[]).find(v =>
      v.attributes?.nodes?.some((a: any) => a.value.toLowerCase().trim() === needle),
    );

    if (!variation) return 'ok';
    return stockLevel(variation.stockStatus ?? 'IN_STOCK', variation.stockQuantity ?? null);
  } catch {
    return 'ok';
  }
}
