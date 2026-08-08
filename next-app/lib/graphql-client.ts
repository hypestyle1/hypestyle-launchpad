// En dev, el fetch sale del browser y WPGraphQL solo permite CORS desde
// hypestyle.com.ar — por eso acá (solo acá, esto es client-side) usamos el
// proxy same-origin (next.config.mjs) en vez de pegarle directo a WP. En
// producción no hace falta (el dominio real ya está whitelisteado). OJO: no
// tocar esto vía NEXT_PUBLIC_GRAPHQL_URL — esa env var también la lee
// app/api/products/route.ts (server-side), donde una URL relativa no resuelve.
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL
  || (process.env.NODE_ENV === 'development' ? '/api/graphql-proxy' : 'https://lightpink-rook-704850.hostingersite.com/graphql');

export async function fetchGraphQL<T>(query: string, variables?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) throw new Error('Network response was not ok');
  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}
