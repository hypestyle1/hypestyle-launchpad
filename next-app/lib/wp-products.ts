import { fetchGraphQL } from './graphql-client';

const GET_SLUGS = `
  query GetProductSlugs($first: Int, $after: String) {
    products(first: $first, after: $after, where: { status: "publish", orderby: { field: DATE, order: ASC } }) {
      pageInfo { hasNextPage endCursor }
      nodes { slug }
    }
  }
`;

// El "first" que pide el caller no importa: WPGraphQL cachea a 100 nodos por
// página igual (confirmado en vivo pidiendo first:200 y recibiendo 100) — hay
// que paginar por cursor para juntar el catálogo completo.
export async function fetchProductSlugs(): Promise<string[]> {
  try {
    const slugs: string[] = [];
    let after: string | null = null;

    for (let i = 0; i < 20; i++) {
      const data = await fetchGraphQL<{ products: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { slug: string }[] } }>(
        GET_SLUGS, { first: 100, after }
      );
      const page = data?.products;
      if (!page) break;
      slugs.push(...page.nodes.map(n => n.slug));
      if (!page.pageInfo?.hasNextPage) break;
      after = page.pageInfo.endCursor;
    }

    return [...new Set(slugs)];
  } catch {
    return [];
  }
}
