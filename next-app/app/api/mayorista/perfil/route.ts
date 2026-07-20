import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { getGlobalMinOrder, customerMinOrderOverride } from '@/lib/mayorista-settings';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function GET(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ message: 'No se pudo cargar el perfil' }, { status: 502 });

  const customer = await res.json();
  const minOrder = customerMinOrderOverride(customer.meta_data) ?? await getGlobalMinOrder();

  return NextResponse.json({
    email: customer.email,
    billing: customer.billing,
    shipping: customer.shipping,
    minOrder,
  });
}
