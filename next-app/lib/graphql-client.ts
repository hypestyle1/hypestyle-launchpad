// En dev, cuando el fetch sale del BROWSER, WPGraphQL bloquea por CORS
// cualquier origen que no sea hypestyle.com.ar — por eso ahí usamos el proxy
// same-origin (next.config.mjs) en vez de pegarle directo a WP. Este mismo
// módulo también se usa server-side (SSR de la ficha de producto, ver
// lib/product-detail.ts): ahí una URL relativa no resuelve (no hay CORS que
// esquivar tampoco, el fetch del server no lo sufre), por eso el proxy es
// SOLO para `typeof window !== 'undefined'`. En producción no hace falta
// ninguna de las dos cosas (el dominio real ya está whitelisteado).
import { fetchWithRetry } from './fetch-retry';

const isBrowser = typeof window !== 'undefined';
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL
  || (isBrowser && process.env.NODE_ENV === 'development' ? '/api/graphql-proxy' : 'https://lightpink-rook-704850.hostingersite.com/graphql');

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
  // Caché de Next: solo tiene efecto en llamadas desde el servidor (el fetch
  // del browser ignora la opción). Sin esto, cada request a una ficha de
  // producto le pegaría de nuevo a WPGraphQL.
  next?: { revalidate: number },
): Promise<T> {
  // Con reintentos: en build esto corre para el sitemap, los generateStaticParams
  // y las 109 fichas de producto, y un solo timeout contra WP tiraba el deploy.
  const response = await fetchWithRetry(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
    ...(next ? { next } : {}),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}
