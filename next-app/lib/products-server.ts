import { fromWPNode, NormalizedProduct } from './products-normalize';
import { fetchWithRetry } from './fetch-retry';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';

const GET_PRODUCTS = `
  query GetProducts($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: DATE, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name slug
        ... on SimpleProduct {
          price regularPrice salePrice stockStatus stockQuantity
          image { sourceUrl }
          galleryImages(first: 3) { nodes { sourceUrl } }
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price regularPrice
          image { sourceUrl }
          galleryImages(first: 3) { nodes { sourceUrl } }
          productCategories { nodes { name } }
          productTags { nodes { slug } }
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

/**
 * WordPress no respondió bien (HTTP de error, GraphQL sin datos o un corte a
 * mitad de la paginación). Es distinto de un catálogo vacío de verdad, que
 * llega con `nodes: []` y una respuesta OK.
 */
export class CatalogUnavailableError extends Error {
  constructor(detail: string) {
    super(`catálogo de WordPress no disponible: ${detail}`);
    this.name = 'CatalogUnavailableError';
  }
}

/**
 * En modo estricto, una respuesta mala de WordPress lanza CatalogUnavailableError
 * en vez de devolver lo que haya juntado hasta ahí (que puede ser [] o media
 * lista). Lo usan los listados (lib/catalog.ts) para no cachear como válido un
 * catálogo vacío o recortado. fetchAllProducts se comporta como siempre: el
 * checkout (pedido-servidor), la home y las alertas de stock no cambian.
 */
export function fetchAllProducts(): Promise<NormalizedProduct[]> {
  return fetchCatalog(false);
}

/** Igual que fetchAllProducts pero lanza CatalogUnavailableError si WordPress falla. */
export function fetchAllProductsStrict(): Promise<NormalizedProduct[]> {
  return fetchCatalog(true);
}

async function fetchCatalog(strict: boolean): Promise<NormalizedProduct[]> {
  // WPGraphQL cachea el "first" a 100 por página sin importar lo que se pida
  // (confirmado en vivo) — hay que paginar por cursor igual que en
  // app/api/products/route.ts, si no los productos más allá del top-100
  // (orden DATE) quedan afuera sin ningún error visible.
  const allNodes: any[] = [];
  let after: string | null = null;

  for (let i = 0; i < 20; i++) {
    // Con reintentos: esto corre en build para el home, /best-sellers y
    // /special-prices. Un timeout suelto contra WP tiraba el deploy entero.
    const res = await fetchWithRetry(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_PRODUCTS, variables: { first: 100, after } }),
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      if (strict) throw new CatalogUnavailableError(`HTTP ${res.status} en la página ${i + 1}`);
      break;
    }
    const { data } = await res.json();
    const page = data?.products;
    if (!page) {
      if (strict) throw new CatalogUnavailableError(`respuesta sin products en la página ${i + 1}`);
      break;
    }
    allNodes.push(...page.nodes);
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  const seen = new Set<string>();
  const uniqueNodes = allNodes.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return uniqueNodes.map(fromWPNode);
}
