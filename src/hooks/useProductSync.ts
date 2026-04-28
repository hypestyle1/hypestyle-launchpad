import { useQuery } from '@tanstack/react-query';
import { fetchGraphQL } from '@/lib/graphql-client';
import { PRODUCTS } from '@/data/products';

const GET_ALL_PRODUCTS = `
  query GetAllProductsForSync {
    products(first: 100) {
      nodes {
        id
        slug
        ... on SimpleProduct {
          price
          regularPrice
          salePrice
          stockStatus
          stockQuantity
        }
        ... on VariableProduct {
          price
          regularPrice
          stockStatus
          stockQuantity
        }
      }
    }
  }
`;

export interface SyncMismatch {
  slug: string;
  type: 'price' | 'stock' | 'missing_local' | 'missing_remote';
  local?: { price: number; originalPrice?: number };
  remote?: { price: number; regularPrice: number; stockStatus: string };
  detail: string;
}

function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
}

function remoteStockStatus(stockStatus: string, stockQuantity: number | null): 'ok' | 'low' | 'out' {
  if (stockStatus === 'OUT_OF_STOCK') return 'out';
  if (stockQuantity !== null && stockQuantity <= 3) return 'low';
  return 'ok';
}

export function useProductSync() {
  return useQuery({
    queryKey: ['product-sync'],
    queryFn: async (): Promise<SyncMismatch[]> => {
      const data = await fetchGraphQL<{ products: { nodes: any[] } }>(GET_ALL_PRODUCTS);
      const remoteNodes: any[] = data?.products?.nodes ?? [];
      const mismatches: SyncMismatch[] = [];

      const remoteBySlug = new Map(remoteNodes.map(n => [n.slug, n]));
      const localBySlug = new Map(PRODUCTS.map(p => [p.slug, p]));

      // Products that exist remotely but not locally
      for (const [slug, remote] of remoteBySlug) {
        if (!localBySlug.has(slug)) {
          mismatches.push({
            slug,
            type: 'missing_local',
            remote: {
              price: parsePrice(remote.price),
              regularPrice: parsePrice(remote.regularPrice),
              stockStatus: remote.stockStatus,
            },
            detail: `Remote product "${slug}" has no local entry in products.ts`,
          });
        }
      }

      // Products that exist locally — check against remote
      for (const local of PRODUCTS) {
        const remote = remoteBySlug.get(local.slug);

        if (!remote) {
          mismatches.push({
            slug: local.slug,
            type: 'missing_remote',
            local: { price: local.price, originalPrice: local.originalPrice },
            detail: `Local product "${local.slug}" not found in WooCommerce`,
          });
          continue;
        }

        const remotePrice = parsePrice(remote.price);
        const remoteRegular = parsePrice(remote.regularPrice);

        // Price mismatch: compare active price and original price
        const activePriceDiffers = remotePrice > 0 && Math.abs(remotePrice - local.price) > 1;
        const regularPriceDiffers =
          remoteRegular > 0 &&
          local.originalPrice !== undefined &&
          Math.abs(remoteRegular - local.originalPrice) > 1;

        if (activePriceDiffers || regularPriceDiffers) {
          mismatches.push({
            slug: local.slug,
            type: 'price',
            local: { price: local.price, originalPrice: local.originalPrice },
            remote: {
              price: remotePrice,
              regularPrice: remoteRegular,
              stockStatus: remote.stockStatus,
            },
            detail: [
              activePriceDiffers && `price: local ${local.price} vs remote ${remotePrice}`,
              regularPriceDiffers && `originalPrice: local ${local.originalPrice} vs remote ${remoteRegular}`,
            ]
              .filter(Boolean)
              .join(' | '),
          });
        }

        // Stock mismatch: compare overall remote stock status vs any local size having stock
        const localHasStock = Object.values(local.stock).some(s => s !== 'out');
        const remoteStatus = remoteStockStatus(remote.stockStatus, remote.stockQuantity ?? null);

        if (remoteStatus === 'out' && localHasStock) {
          mismatches.push({
            slug: local.slug,
            type: 'stock',
            local: { price: local.price, originalPrice: local.originalPrice },
            remote: {
              price: remotePrice,
              regularPrice: remoteRegular,
              stockStatus: remote.stockStatus,
            },
            detail: `Remote is OUT_OF_STOCK but local sizes still show available stock`,
          });
        }
      }

      return mismatches;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
