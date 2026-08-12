// Catálogo mayorista: mismos productos del sitio público, pero precio = 50% del
// regular_price (precio de lista), ignorando cualquier promo/sale_price vigente.

import { fetchWithRetry } from './fetch-retry';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';
const WHOLESALE_FACTOR = 0.5;

const GET_PRODUCTS = `
  query GetProductsMayorista($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: DATE, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name slug shortDescription
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
  shortDescription: string;
  wholesalePrice: number;
  regularPrice: number;
  image: string;
  images: string[];
  sizes: string[];
  stock: Record<string, 'ok' | 'low' | 'out'>;
  stockQty: Record<string, number | null>;
}

// La descripción corta de WP viene con HTML (<p>, &nbsp;, etc.) — acá solo
// se muestra como una línea de texto plano bajo el nombre del producto.
function stripHtml(html?: string | null): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&oacute;/g, 'ó').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
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

// Productos puntuales que el negocio decidió no ofrecer a mayoristas
// (a mano, no hay una regla automática detrás — pedido explícito).
const EXCLUDED_SLUGS = new Set(['hs-ring-silver-925', 'zip-hoodie-pink']);

// Con cuántas unidades "de esfuerzo de stock" carga un producto: 2 por talle
// agotado, 1 por talle con poco stock, 0 si está todo ok. Se usa para orden
// (más bajo = más disponible = va primero) y para sacar del todo los que no
// tienen ningún talle disponible.
function stockScore(p: MayoristaProduct): number {
  return p.sizes.reduce((sum, s) => sum + (p.stock[s] === 'out' ? 2 : p.stock[s] === 'low' ? 1 : 0), 0);
}
function isFullyOut(p: MayoristaProduct): boolean {
  return p.sizes.length > 0 && p.sizes.every((s) => p.stock[s] === 'out');
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
    shortDescription: stripHtml(node.shortDescription),
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
    // Con reintentos: /mayoristas se prerenderiza en el build y fue una de las
    // páginas que se cayó por un timeout suelto contra WP.
    const res = await fetchWithRetry(GRAPHQL_URL, {
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

  // orderby DATE (no MENU_ORDER, ver mismo fix en app/api/products/route.ts):
  // con MENU_ORDER compartido entre casi todos los productos, el cursor de
  // WPGraphQL no solo duplicaba nodos entre páginas sino que podía omitir
  // productos enteros del resultado total. El dedupe de abajo queda como
  // resguardo, pero la causa real era el sort key no-único.
  const seenIds = new Set<string>();
  const dedupedNodes = allNodes.filter((n: any) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });

  const products = dedupedNodes
    .filter((n: any) => !isCombo(n) && !EXCLUDED_SLUGS.has(n.slug))
    .map(fromNode)
    .filter((p: MayoristaProduct) => p.regularPrice > 0 && !isFullyOut(p));

  // Estable: entre productos con el mismo puntaje de stock, se mantiene el
  // orden que ya traían (menu_order del sitio).
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => stockScore(a.p) - stockScore(b.p) || a.i - b.i)
    .map(({ p }) => p);
}

export async function fetchMayoristaProduct(slug: string): Promise<MayoristaProduct | null> {
  const products = await fetchMayoristaProducts();
  return products.find(p => p.slug === slug) ?? null;
}
