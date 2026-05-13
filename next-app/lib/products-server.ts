import { fromWPNode, NormalizedProduct } from './products-normalize';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://hypestyle.local/graphql';

const GET_PRODUCTS = `
  query GetProducts($first: Int) {
    products(first: $first, where: { status: "publish", orderby: { field: MENU_ORDER, order: ASC } }) {
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
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GET_PRODUCTS, variables: { first: 100 } }),
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data?.products?.nodes ?? []).map(fromWPNode);
}
