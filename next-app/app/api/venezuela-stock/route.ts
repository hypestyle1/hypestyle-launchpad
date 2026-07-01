import { NextResponse } from 'next/server';

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  'https://lightpink-rook-704850.hostingersite.com/graphql';

const INITIAL_STOCK = 38;
const SPLINTS_PER_UNIT = 10.5;
const SPLINTS_GOAL = 600;
const FOMO_OFFSET = 240; // unidades comprometidas pre-lanzamiento online

const QUERY = `{
  product(id: "stars-for-venezuela-hoodie", idType: SLUG) {
    ... on VariableProduct {
      variations(first: 20) {
        nodes { stockQuantity stockStatus }
      }
    }
  }
}`;

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
      next: { revalidate: 60 },
    });

    const { data } = await res.json();
    const nodes: Array<{ stockQuantity: number | null; stockStatus: string }> =
      data?.product?.variations?.nodes ?? [];

    const totalStock = nodes.reduce(
      (sum, v) => sum + (v.stockStatus !== 'OUT_OF_STOCK' ? (v.stockQuantity ?? 0) : 0),
      0,
    );

    const soldUnits = Math.max(0, INITIAL_STOCK - totalStock);
    const projectedSplints = Math.min(
      SPLINTS_GOAL,
      Math.round(soldUnits * SPLINTS_PER_UNIT) + FOMO_OFFSET,
    );
    const progress = Math.min(100, (projectedSplints / SPLINTS_GOAL) * 100);

    return NextResponse.json(
      { totalStock, soldUnits, projectedSplints, progress, soldOut: totalStock <= 0 },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' } },
    );
  } catch {
    return NextResponse.json(
      { totalStock: INITIAL_STOCK, soldUnits: 0, projectedSplints: 0, progress: 0, soldOut: false },
    );
  }
}
