import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetch-retry';
import { SLUGS_INTERNOS } from '@/lib/catalog';
import { unstable_cache } from 'next/cache';
import { crearCortacircuitos } from '@/lib/wp-cortacircuitos';

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
          galleryImages(first: 3) { nodes { sourceUrl } }
          weight
          productCategories { nodes { name } }
          productTags { nodes { slug } }
        }
        ... on VariableProduct {
          price
          regularPrice
          image { sourceUrl }
          galleryImages(first: 3) { nodes { sourceUrl } }
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

// Consultar Woo en ejecución; un timeout externo no debe impedir el build.
export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * Integración 4/11 (incidente MySQL/Hostinger): esta lectura es la "consulta de
 * ~400 posts" que señaló Hostinger (≈150 productos + sus variaciones). Antes
 * cada vencimiento de la caché de datos lanzaba una relectura por request, con
 * 4 intentos de 15 s. Ahora pasa por unstable_cache (60 s, compartida) + el
 * cortacircuitos: una lectura a la vez, 1 intento de hasta 25 s, 60 s de pausa
 * tras una falla, y si WordPress falla se sirve la última versión buena.
 */
class CatalogoNoDisponible extends Error {}
const proteger = crearCortacircuitos(60_000);
const nodosCompartidos = unstable_cache(() => proteger(leerNodos), ['api-products-nodos-v1'], { revalidate: 60 });

export async function GET() {
  let nodos: any[];
  try {
    nodos = await nodosCompartidos();
  } catch (err) {
    const status = err instanceof CatalogoNoDisponible ? 502 : 503;
    return NextResponse.json({ error: 'GraphQL fetch failed' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ products: { nodes: nodos } }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}

async function leerNodos(): Promise<any[]> {
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
      cache: 'no-store',
    }, { retries: 0, timeoutMs: 25_000 });

    if (!res.ok) throw new CatalogoNoDisponible(`HTTP ${res.status}`);

    const { data, errors } = await res.json();
    if (errors) throw new CatalogoNoDisponible(String(errors[0]?.message ?? 'GraphQL error'));

    const page = data?.products;
    if (!page) break;
    allNodes.push(...page.nodes);
    if (!page.pageInfo?.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  // Productos internos (regalo del Purchase Gift, gift card, sleeveless
  // agrupada): la lista y el porqué viven en lib/catalog.ts, que la comparte
  // con el HTML inicial de los listados.

  // La mayoría de los productos comparten menu_order (nunca se seteó a mano por
  // producto), así que el cursor de WPGraphQL no separa las páginas de forma
  // estable — página 2 puede repetir nodos que ya vinieron en la página 1. Se
  // dedupe por id antes de devolver, así ningún consumidor de este endpoint
  // (home, colecciones, etc.) puede terminar mostrando la misma card dos veces.
  const seen = new Set<string>();
  return allNodes.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return !SLUGS_INTERNOS.has(n.slug);
  });
}
