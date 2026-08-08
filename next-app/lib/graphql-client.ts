const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
  // Caché de Next: solo tiene efecto en llamadas desde el servidor (el fetch
  // del browser ignora la opción). Sin esto, cada request a una ficha de
  // producto le pegaría de nuevo a WPGraphQL.
  next?: { revalidate: number },
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
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
