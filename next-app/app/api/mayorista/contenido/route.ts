import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export interface ContenidoProducto {
  id: number;
  name: string;
  slug: string;
  images: string[];
  video: string | null;
}

// Banco de contenido para mayoristas: fotos de galería (originales, en alta) y
// video de los productos que el cliente ya recibió. Solo pedidos `completed` —
// el contenido se habilita cuando el pedido figura entregado.
export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const ordersRes = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?customer=${customerId}&status=completed&per_page=50&orderby=date&order=desc&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' },
  );
  if (!ordersRes.ok) return NextResponse.json({ message: 'No se pudo cargar el contenido' }, { status: 502 });

  const orders = await ordersRes.json() as any[];
  // Únicos, en el orden del pedido más reciente primero.
  const productIds: number[] = [];
  for (const o of orders) {
    for (const li of (o.line_items as any[]) ?? []) {
      if (li.product_id && !productIds.includes(li.product_id)) productIds.push(li.product_id);
    }
  }
  if (productIds.length === 0) return NextResponse.json({ products: [] });

  const byId = new Map<number, ContenidoProducto>();
  for (let i = 0; i < productIds.length; i += 20) {
    const chunk = productIds.slice(i, i + 20);
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/products?include=${chunk.join(',')}&per_page=20&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ message: 'No se pudo cargar el contenido' }, { status: 502 });
    for (const p of await res.json() as any[]) {
      const video = (p.meta_data as any[])?.find((m: any) => m.key === 'product_video_url')?.value || null;
      byId.set(p.id, {
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: ((p.images as any[]) ?? []).map((img: any) => img.src).filter(Boolean),
        video: typeof video === 'string' && video ? video : null,
      });
    }
  }

  const products = productIds
    .map((id) => byId.get(id))
    .filter((p): p is ContenidoProducto => !!p && (p.images.length > 0 || !!p.video));

  return NextResponse.json({ products });
}
