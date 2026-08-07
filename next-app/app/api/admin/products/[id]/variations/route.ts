import { NextRequest, NextResponse } from 'next/server';
import { sizeFromAttributes } from '@/lib/product-size';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !!ADMIN_SECRET && key === ADMIN_SECRET;
}

// Variaciones de un producto (talles) para el selector de "agregar producto" en el pedido.
// Si el producto es simple (sin variaciones), devuelve una única entrada "sin talle".
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const productId = params.id;
  const product = await fetch(
    `${WP_URL}/wp-json/wc/v3/products/${productId}?_fields=id,type,regular_price,price,manage_stock,stock_quantity&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' }
  ).then(r => r.json());

  if (product.type !== 'variable') {
    return NextResponse.json({
      variations: [{
        id: null,
        size: '',
        price: parseFloat(product.regular_price || product.price || '0'),
        manageStock: !!product.manage_stock,
        stock: product.stock_quantity,
      }],
    });
  }

  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=50&_fields=id,attributes,regular_price,price,manage_stock,stock_quantity&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!Array.isArray(data)) return NextResponse.json({ error: 'No se pudieron traer las variaciones' }, { status: 502 });

  const variations = data.map((v: any) => ({
    id: v.id,
    size: sizeFromAttributes(v.attributes || []),
    price: parseFloat(v.regular_price || v.price || '0'),
    manageStock: !!v.manage_stock,
    stock: v.stock_quantity,
  }));

  return NextResponse.json({ variations });
}
