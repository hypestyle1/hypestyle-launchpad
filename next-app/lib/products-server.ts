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
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price regularPrice
          image { sourceUrl }
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

export async function fetchAllProducts(): Promise<NormalizedProduct[]> {
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
    if (!res.ok) break;
    const { data } = await res.json();
    const page = data?.products;
    if (!page) break;
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
