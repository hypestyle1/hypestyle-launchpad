import { fetchGraphQL } from './graphql-client';

const GET_SLUGS = `
  query GetProductSlugs($first: Int) {
    products(first: $first, where: { status: "publish" }) {
      nodes { slug }
    }
  }
`;

export async function fetchProductSlugs(first = 200): Promise<string[]> {
  try {
    const data = await fetchGraphQL<{ products: { nodes: { slug: string }[] } }>(
      GET_SLUGS, { first }
    );
    return data?.products?.nodes?.map(n => n.slug) ?? [];
  } catch {
    return [];
  }
}
