import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';

const GET_PRODUCTS = `
  query GetProducts($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: DATE, order: ASC } }) {
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
          weight
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price
          regularPrice
          image { sourceUrl }
          weight
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
  // los 100 productos publicados (ya está en 108) los últimos quedaban afuera
  // en TODO el sitio que usa este endpoint (home, colecciones, best sellers,
  // básicos, etc.) sin ningún error visible — mismo bug que ya se había
  // corregido en el catálogo mayorista (ver lib/mayorista-products.ts).
  //
  // orderby DATE (no MENU_ORDER): confirmado en vivo (01/08/26) que ordenar
  // por MENU_ORDER (compartido/0 en casi todos los productos, nunca se seteó
  // a mano) hace que el cursor de WPGraphQL no solo duplique nodos entre
  // páginas sino que directamente OMITA productos enteros del resultado total
  // (ej. per-aspera-ad-astra-zippo, zip-hoodie-pink, zip-hoodie-camo,
  // only-god-can-judge-me-negra no aparecían en ninguna página). DATE es único
  // por producto — con eso las 2 páginas devuelven exactamente 108/108 sin
  // faltantes ni duplicados.
  for (let i = 0; i < 20; i++) {
    // Con reintentos: esta ruta se prerenderiza en el build y un solo timeout
    // contra WP hacía fallar el deploy completo.
    const res = await fetchWithRetry(GRAPHQL_URL, {
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

  // Productos internos: existen en Woo pero no son parte del catálogo público.
  // `catalog_visibility: hidden` no alcanza para sacarlos del sitio — la query
  // de arriba filtra por `status`, no por visibilidad, así que este endpoint es
  // el único lugar donde se decide qué ve el sitio.
  //
  // par-de-medias-hype (3000) es el regalo del Purchase Gift. Tiene que estar
  // `publish` porque el motor del plugin llama a `is_purchasable()`, que rechaza
  // los `private` — por eso no se puede esconder del lado de WordPress como sí
  // se hace con las pilas de blanks del stock compartido.
  //
  // gift-card (3012) es la gift card: se compra desde /gift-cards con su propia
  // UI de monto, no desde una card del catálogo.
  const SLUGS_INTERNOS = new Set(['par-de-medias-hype', 'gift-card']);

  // La mayoría de los productos comparten menu_order (nunca se seteó a mano por
  // producto), así que el cursor de WPGraphQL no separa las páginas de forma
  // estable — página 2 puede repetir nodos que ya vinieron en la página 1. Se
  // dedupe por id antes de devolver, así ningún consumidor de este endpoint
  // (home, colecciones, etc.) puede terminar mostrando la misma card dos veces.
  const seen = new Set<string>();
  const uniqueNodes = allNodes.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return !SLUGS_INTERNOS.has(n.slug);
  });

  return NextResponse.json({ products: { nodes: uniqueNodes } }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
