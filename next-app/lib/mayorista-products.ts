// Catálogo mayorista: mismos productos del sitio público, pero precio = 50% del
// regular_price (precio de lista), ignorando cualquier promo/sale_price vigente.

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';
const WHOLESALE_FACTOR = 0.5;

const GET_PRODUCTS = `
  query GetProductsMayorista($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: MENU_ORDER, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name slug
        ... on SimpleProduct {
          regularPrice stockStatus stockQuantity
          image { sourceUrl }
          galleryImages { nodes { sourceUrl } }
          productCategories { nodes { name slug } }
        }
        ... on VariableProduct {
          regularPrice
          image { sourceUrl }
          galleryImages { nodes { sourceUrl } }
          productCategories { nodes { name slug } }
          variations(first: 20) {
            nodes {
              stockStatus stockQuantity
              attributes { nodes { name value } }
            }
          }
        }
      }
    }
  }
`;

export interface MayoristaProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  wholesalePrice: number;
  regularPrice: number;
  image: string;
  images: string[];
  sizes: string[];
  stock: Record<string, 'ok' | 'low' | 'out'>;
  stockQty: Record<string, number | null>;
}

function parsePrice(s?: string | null): number {
  if (!s) return 0;
  // WPGraphQL devuelve algo como "$&nbsp;45.000,00" (punto = miles, coma = decimales).
  return parseFloat(String(s).replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'Única'];
function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a), bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function stockLevel(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 0) return 'out';
  if (qty !== null && qty <= 5) return 'low';
  return 'ok';
}

// Combos/packs (ej. "Regular Tees 3 PACK", "CAMO FULL SET - COMBO") son
// promos armadas para el minorista — no tienen sentido en mayorista, donde
// el cliente ya compra por volumen los productos individuales.
const EXCLUDED_CATEGORY_SLUGS = new Set(['pack', 'set']);
function isCombo(node: any): boolean {
  const slugs: string[] = (node.productCategories?.nodes ?? []).map((c: any) => c.slug);
  return slugs.some((s) => EXCLUDED_CATEGORY_SLUGS.has(s));
}

function fromNode(node: any): MayoristaProduct {
  const regularPrice = parsePrice(node.regularPrice);
  const wholesalePrice = Math.round(regularPrice * WHOLESALE_FACTOR);

  const images: string[] = [];
  if (node.image?.sourceUrl) images.push(node.image.sourceUrl);
  (node.galleryImages?.nodes ?? []).forEach((g: any) => {
    if (g.sourceUrl && !images.includes(g.sourceUrl)) images.push(g.sourceUrl);
  });

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const stockQty: Record<string, number | null> = {};
  const variations: any[] = node.variations?.nodes ?? [];

  if (variations.length) {
    for (const v of variations) {
      const sizeAttr = v.attributes?.nodes?.find((a: any) => {
        const n = (a.name || '').toLowerCase();
        return n === 'talle' || n === 'size' || n === 'pa_talle' || n === 'pa_size';
      }) ?? v.attributes?.nodes?.[0];
      const sz = sizeAttr?.value?.trim() || 'Única';
      if (!sizes.includes(sz)) {
        sizes.push(sz);
        stock[sz] = stockLevel(v.stockStatus, v.stockQuantity ?? null);
        stockQty[sz] = v.stockQuantity ?? null;
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockLevel(node.stockStatus || 'IN_STOCK', node.stockQuantity ?? null);
    stockQty['Única'] = node.stockQuantity ?? null;
  }

  return {
    id: node.slug,
    name: node.name,
    slug: node.slug,
    category: node.productCategories?.nodes?.[0]?.name ?? '',
    wholesalePrice,
    regularPrice,
    image: images[0] ?? '',
    images,
    sizes: sortSizes(sizes),
    stock,
    stockQty,
  };
}

export async function fetchMayoristaProducts(): Promise<MayoristaProduct[]> {
  const allNodes: any[] = [];
  let after: string | null = null;

  // Paginado por cursor: el catálogo mayorista tiene que mostrar TODO lo
  // publicado, no un tope fijo — con "first: 100" a secas, el producto 101
  // (o el que sea que WPGraphQL ordene después) quedaba afuera sin aviso.
  for (let i = 0; i < 20; i++) {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_PRODUCTS, variables: { first: 100, after } }),
      next: { revalidate: 60 },
    });
    if (!res.ok) break;
    const { data } = await res.json();
    const page = data?.products;
    if (!page) break;
    allNodes.push(...page.nodes);
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  return allNodes
    .filter((n: any) => !isCombo(n))
    .map(fromNode)
    .filter((p: MayoristaProduct) => p.regularPrice > 0);
}

export async function fetchMayoristaProduct(slug: string): Promise<MayoristaProduct | null> {
  const products = await fetchMayoristaProducts();
  return products.find(p => p.slug === slug) ?? null;
}
