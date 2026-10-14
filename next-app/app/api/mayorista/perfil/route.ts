import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { resolveMinOrder, customerMinOrderOverride, MIN_ORDER_UNAVAILABLE_MESSAGE } from '@/lib/mayorista-settings';
import { parseCredit } from '@/lib/mayorista-credit';
import { parseBloqueo, mensajeBloqueo, parseExclusividad } from '@/lib/mayorista-exclusividad';
import { pagoInfoFromEnv } from '@/lib/mayorista-pago';

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
  // Mínimo base de la cuenta (override o general). El de campaña lo agrega
  // /api/mayorista/disponibilidad, que conoce las líneas del carrito. Si el
  // general no se pudo leer viene null y el carrito no deja continuar.
  const minOrder = await resolveMinOrder({ override: customerMinOrderOverride(customer.meta_data) });
  const meta = (customer.meta_data ?? []) as { key: string; value: string }[];
  const metaVal = (key: string) => meta.find((m) => m.key === key)?.value ?? '';

  return NextResponse.json({
    email: customer.email,
    billing: customer.billing,
    shipping: customer.shipping,
    minOrder,
    ...(minOrder == null ? { minOrderError: MIN_ORDER_UNAVAILABLE_MESSAGE } : {}),
    dni: metaVal('dni'),
    viaCargoSucursal: metaVal('via_cargo_sucursal'),
    // Último método de envío elegido. Las cuentas viejas no lo tienen: el
    // checkout arranca en Via Cargo con la sucursal que ya tenían.
    envioMetodo: metaVal('mayorista_envio_metodo'),
    envioDestino: metaVal('mayorista_envio_destino'),
    credit: parseCredit(meta).saldo,
    // Datos para pagar (lib/mayorista-pago.ts): los muestra la confirmación del pedido.
    pago: pagoInfoFromEnv(),
    // Datos de la cuenta para "Mi cuenta": razón social, CUIT, Instagram, ciudad.
    cuit: metaVal('mayorista_cuit'),
    instagram: metaVal('mayorista_instagram'),
    aprobadoEl: metaVal('mayorista_aprobado_fecha') || null,
    // Exclusividad que tiene esta cuenta (titular), si la tiene.
    exclusividad: parseExclusividad(meta),
    // Otro local tiene la exclusividad de su ciudad: el portal lo avisa y el
    // carrito no deja confirmar (el pedido lo rechaza igual en el servidor).
    bloqueoExclusividad: (() => { const b = parseBloqueo(meta); return b ? { ciudad: b.ciudad, mensaje: mensajeBloqueo(b) } : null; })(),
  });
}
