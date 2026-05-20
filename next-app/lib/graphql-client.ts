const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://hypestyle.local/graphql';

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
