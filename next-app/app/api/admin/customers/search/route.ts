import { NextRequest, NextResponse } from 'next/server';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';
const ADMIN_SECRET = process.env.WP_SECRET          || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || '';
  return !!ADMIN_SECRET && key === ADMIN_SECRET;
}

// Busca entre las cuentas de WooCommerce (mayoristas + cualquier cliente registrado).
// No busca compradores invitados de pedidos minoristas — la gran mayoría son guest
// checkout, así que para esos el admin carga los datos a mano en el formulario.
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) return NextResponse.json({ customers: [] });

  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/customers?search=${encodeURIComponent(q)}&per_page=10&_fields=id,first_name,last_name,email,billing,meta_data&_cb=${Date.now()}`,
    { headers: { Authorization: wcAuth() }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!Array.isArray(data)) return NextResponse.json({ customers: [] });

  const customers = data.map((c: any) => {
    const isMayorista = (c.meta_data || []).some((m: any) => m.key === 'es_mayorista' && String(m.value) === 'true');
    const dni = (c.meta_data || []).find((m: any) => m.key === 'dni')?.value || '';
    return {
      id: c.id,
      name: `${c.billing?.first_name || c.first_name} ${c.billing?.last_name || c.last_name}`.trim(),
      email: c.email,
      isMayorista,
      billing: {
        first_name: c.billing?.first_name || c.first_name || '',
        last_name:  c.billing?.last_name  || c.last_name  || '',
        phone:      c.billing?.phone      || '',
        company:    c.billing?.company    || '',
        address_1:  c.billing?.address_1  || '',
        address_2:  c.billing?.address_2  || '',
        city:       c.billing?.city       || '',
        state:      c.billing?.state      || '',
        postcode:   c.billing?.postcode   || '',
      },
      dni,
    };
  });

  return NextResponse.json({ customers });
}
