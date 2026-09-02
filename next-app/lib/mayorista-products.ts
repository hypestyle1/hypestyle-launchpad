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
          attributes { nodes { name options } }
        }
        ... on VariableProduct {
          regularPrice
          image { sourceUrl }
          galleryImages { nodes { sourceUrl } }
          productCategories { nodes { name slug } }
          attributes { nodes { name options } }
          variations(first: 100) {
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
  // Colores ofrecidos, en el orden en que están cargados en Woo. Salen del
  // atributo "Color" del producto. Vacío si el producto no tiene color.
  colors: string[];
  // true cuando Color es eje de variación (Color + Talle, ej. SLEEVELESS
  // RANGLAN): ahí el stock se lleva por color y talle. false cuando Color es
  // un atributo informativo del producto (caso AERO: una sola entrada en Woo
  // "disponible en blanco, gris melange y negro"), donde el stock es por
  // talle y el color viaja como dato del pedido.
  colorAxis: boolean;
  // Clave = stockKey(product, size, color).
  stock: Record<string, 'ok' | 'low' | 'out'>;
  stockQty: Record<string, number | null>;
}

/** Clave del stock de una combinación talle/color. */
export function stockKey(p: Pick<MayoristaProduct, 'colorAxis'>, size: string, color?: string | null): string {
  return p.colorAxis && color ? `${color} / ${size}` : size;
}

const LEVEL_RANK = { ok: 0, low: 1, out: 2 } as const;

/** Disponibilidad de un talle mirando todos sus colores (la mejor de todas). */
export function sizeLevel(p: MayoristaProduct, size: string): 'ok' | 'low' | 'out' {
  if (!p.colorAxis) return p.stock[size] ?? 'out';
  let best: 'ok' | 'low' | 'out' = 'out';
  for (const c of p.colors) {
    const lvl = p.stock[stockKey(p, size, c)];
    if (lvl && LEVEL_RANK[lvl] < LEVEL_RANK[best]) best = lvl;
  }
  return best;
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

function isSizeAttr(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n === 'talle' || n === 'size' || n === 'pa_talle' || n === 'pa_size';
}
function isColorAttr(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n === 'color' || n === 'pa_color' || n === 'colour';
}

function stockLevel(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 0) return 'out';
  if (qty !== null && qty <= 5) return 'low';
  return 'ok';
}

// Combos/packs (ej. "Regular Tees 3 PACK", "CAMO FULL SET - COMBO") son
// promos armadas para el minorista — no tienen sentido en mayorista, donde
// el cliente ya compra por volumen los productos individuales. La Gift Card
// tampoco: es un saldo para comprar en el sitio, no mercadería para revender.
const EXCLUDED_CATEGORY_SLUGS = new Set(['pack', 'set', 'gift-card']);
function isCombo(node: any): boolean {
  const slugs: string[] = (node.productCategories?.nodes ?? []).map((c: any) => c.slug);
  return slugs.some((s) => EXCLUDED_CATEGORY_SLUGS.has(s));
}

/** Productos que no se ofrecen a mayoristas (por categoría o por slug). */
export function isExcludedFromMayorista(node: any): boolean {
  return isCombo(node) || EXCLUDED_SLUGS.has(node.slug);
}

// Productos puntuales que el negocio decidió no ofrecer a mayoristas
// (a mano, no hay una regla automática detrás — pedido explícito).
const EXCLUDED_SLUGS = new Set(['hs-ring-silver-925', 'zip-hoodie-pink']);

// Con cuántas unidades "de esfuerzo de stock" carga un producto: 2 por talle
// agotado, 1 por talle con poco stock, 0 si está todo ok. Se usa para orden
// (más bajo = más disponible = va primero) y para sacar del todo los que no
// tienen ningún talle disponible.
function stockScore(p: MayoristaProduct): number {
  return p.sizes.reduce((sum, s) => sum + LEVEL_RANK[sizeLevel(p, s)], 0);
}
function isFullyOut(p: MayoristaProduct): boolean {
  return p.sizes.length > 0 && p.sizes.every((s) => sizeLevel(p, s) === 'out');
}

export function normalizeMayoristaNode(node: any): MayoristaProduct {
  const regularPrice = parsePrice(node.regularPrice);
  const wholesalePrice = Math.round(regularPrice * WHOLESALE_FACTOR);

  const images: string[] = [];
  if (node.image?.sourceUrl) images.push(node.image.sourceUrl);
  (node.galleryImages?.nodes ?? []).forEach((g: any) => {
    if (g.sourceUrl && !images.includes(g.sourceUrl)) images.push(g.sourceUrl);
  });

  // Colores del producto: el atributo "Color" de Woo, sea o no eje de
  // variación. Antes el catálogo ignoraba cualquier atributo que no fuera el
  // talle y el mayorista no tenía forma de pedir "la negra".
  const colors: string[] = [];
  const colorAttr = (node.attributes?.nodes ?? []).find((a: any) => isColorAttr(a.name));
  for (const o of colorAttr?.options ?? []) {
    const c = String(o ?? '').trim();
    if (c && !colors.includes(c)) colors.push(c);
  }

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const stockQty: Record<string, number | null> = {};
  const variations: any[] = node.variations?.nodes ?? [];
  let colorAxis = false;

  if (variations.length) {
    for (const v of variations) {
      const attrs: any[] = v.attributes?.nodes ?? [];
      const sizeAttr = attrs.find((a) => isSizeAttr(a.name)) ?? attrs.find((a) => !isColorAttr(a.name));
      const colorVal = attrs.find((a) => isColorAttr(a.name))?.value?.trim() || '';
      const sz = sizeAttr?.value?.trim() || 'Única';
      if (colorVal) {
        colorAxis = true;
        if (!colors.includes(colorVal)) colors.push(colorVal);
      }
      if (!sizes.includes(sz)) sizes.push(sz);
      const key = colorVal ? `${colorVal} / ${sz}` : sz;
      if (!(key in stock)) {
        stock[key] = stockLevel(v.stockStatus, v.stockQuantity ?? null);
        stockQty[key] = v.stockQuantity ?? null;
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockLevel(node.stockStatus || 'IN_STOCK', node.stockQuantity ?? null);
    stockQty['Única'] = node.stockQuantity ?? null;
  }

  // Con Color como eje, cada talle/color tiene su clave aunque Woo no haya
  // creado esa variación (queda 'out'): así la UI no cae en undefined.
  if (colorAxis) {
    for (const c of colors) for (const sz of sizes) {
      const key = `${c} / ${sz}`;
      if (!(key in stock)) { stock[key] = 'out'; stockQty[key] = 0; }
    }
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
    colors,
    colorAxis,
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
    .filter((n: any) => !isExcludedFromMayorista(n))
    .map(normalizeMayoristaNode)
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
