import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pedido = searchParams.get('pedido');
  const clave  = searchParams.get('clave');

  if (!pedido || !clave) {
    return NextResponse.json({ message: 'Parámetros faltantes' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${WP_URL}/wp-json/hypestyle/v1/tracking?pedido=${encodeURIComponent(pedido)}&clave=${encodeURIComponent(clave)}`,
      { next: { revalidate: 0 } },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: 'Error al consultar el estado del pedido' }, { status: 500 });
  }
}
