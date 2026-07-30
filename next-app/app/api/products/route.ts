import { NextResponse } from 'next/server';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';

const GET_PRODUCTS = `
  query GetProducts($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: MENU_ORDER, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
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
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price
          regularPrice
          image { sourceUrl }
          productCategories { nodes { name } }
          productTags { nodes { slug } }
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

export const revalidate = 60;

export async function GET() {
  const allNodes: any[] = [];
  let after: string | null = null;

  // Paginado por cursor: con "first: 100" a secas, en cuanto el catálogo pasó
  // los 100 productos publicados (ya está en 106) los últimos quedaban afuera
  // en TODO el sitio que usa este endpoint (home, colecciones, best sellers,
  // básicos, etc.) sin ningún error visible — mismo bug que ya se había
  // corregido en el catálogo mayorista (ver lib/mayorista-products.ts).
  for (let i = 0; i < 20; i++) {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_PRODUCTS, variables: { first: 100, after } }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'GraphQL fetch failed' }, { status: 502 });
    }

    const { data, errors } = await res.json();
    if (errors) {
      return NextResponse.json({ error: errors[0].message }, { status: 500 });
    }

    const page = data?.products;
    if (!page) break;
    allNodes.push(...page.nodes);
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  // La mayoría de los productos comparten menu_order (nunca se seteó a mano por
  // producto), así que el cursor de WPGraphQL no separa las páginas de forma
  // estable — página 2 puede repetir nodos que ya vinieron en la página 1. Se
  // dedupe por id antes de devolver, así ningún consumidor de este endpoint
  // (home, colecciones, etc.) puede terminar mostrando la misma card dos veces.
  const seen = new Set<string>();
  const uniqueNodes = allNodes.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return NextResponse.json({ products: { nodes: uniqueNodes } }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
