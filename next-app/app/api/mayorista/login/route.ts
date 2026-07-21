import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, createSessionToken, authenticateMayoristaCustomer } from '@/lib/mayorista-auth';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_SEC = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

// Cuenta cada login exitoso — para /admin/mayoristas (motor: "quién entra
// pero nunca compra" vs "cliente activo"). Sin guión bajo en las meta keys,
// mismo motivo que es_mayorista/dni/etc: WC descarta los meta "protegidos"
// al actualizar un customer por REST.
async function trackLogin(customerId: number) {
  try {
    const getRes = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}?_fields=meta_data`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    const meta = getRes.ok ? ((await getRes.json()).meta_data ?? []) : [];
    const currentCount = Number(meta.find((m: any) => m.key === 'mayorista_login_count')?.value) || 0;

    await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify({
        meta_data: [
          { key: 'mayorista_last_login', value: new Date().toISOString() },
          { key: 'mayorista_login_count', value: String(currentCount + 1) },
        ],
      }),
    });
  } catch (e) {
    console.error('[mayorista/login] trackLogin error:', e);
  }
}

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json();
  if (typeof user !== 'string' || typeof pass !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await authenticateMayoristaCustomer(user, pass);
  if (!result) {
    return NextResponse.json({ ok: false, message: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }
  if ('error' in result) {
    console.error('[mayorista/login] WP error:', result.error);
    return NextResponse.json({ ok: false, message: 'Error de conexión, probá de nuevo' }, { status: 502 });
  }

  await trackLogin(result.customerId);

  const token = await createSessionToken(result.customerId);
  const res = NextResponse.json({ ok: true, label: result.label });
  res.cookies.set(MAYORISTA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
