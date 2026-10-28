import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { esEstadoWcValido, WC_ORDER_STATUSES, WC_STATUS_LABELS, type WcOrderStatus } from '@/lib/wc-order-status';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

/** Etiqueta en castellano de un estado, o el slug si no es uno de los nuestros. */
function label(s: string) {
  return WC_STATUS_LABELS[s as WcOrderStatus] || s;
}

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

/**
 * Relee el pedido desde WooCommerce y devuelve el estado guardado.
 *
 * `_cb` es obligatorio: LiteSpeed cachea los GET autenticados de wc/v3 y sin el
 * cache-buster la relectura puede traer la copia previa al PUT, o sea reportar
 * un error que no existe (ver reference_litespeed_cachea_wc_rest_listas).
 *
 * Devuelve null si no se pudo leer: "no sabemos" no es lo mismo que "falló".
 */
async function leerEstado(orderId: number | string): Promise<string | null> {
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders/${orderId}?_fields=id,status&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.status === 'string' ? data.status : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { orderId, status } = await req.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId y status requeridos' }, { status: 400 });
  }

  // WC valida `status` contra wc_get_order_statuses() y responde 400 por un
  // estado que no existe. Se corta acá para que el error diga qué pasó en vez de
  // llegar como un 502 genérico: así se perdían las marcas de "enviado" (el PUT
  // fallaba, el panel mostraba el cambio igual y nadie se enteraba).
  if (!esEstadoWcValido(status)) {
    return NextResponse.json(
      { error: `El estado "${status}" no existe en WooCommerce. Válidos: ${WC_ORDER_STATUSES.join(', ')}.` },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: { Authorization: wcAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  } catch (e) {
    // La conexión se cortó sin respuesta: el PUT pudo haber llegado igual, así
    // que no se afirma que falló — se relee y se cuenta lo que hay.
    const real = await leerEstado(orderId);
    if (real === status) return NextResponse.json({ ok: true, confirmado: true, status: real });
    return NextResponse.json(
      {
        error: `Se cortó la conexión con WooCommerce (${e instanceof Error ? e.message : 'error de red'}).`
             + (real ? ` El pedido quedó en "${label(real)}".` : ' No pudimos releer el pedido.'),
        status: real ?? undefined,
        confirmado: false,
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Un 400/404 de WC es un problema del pedido o del dato (medido en prod: un
    // id inexistente devuelve 400 woocommerce_rest_shop_order_invalid_id), no una
    // caída del backend. Devolverlo como 502 hacía que todo pareciera lo mismo.
    const codigo = res.status === 400 || res.status === 404 ? res.status : 502;
    return NextResponse.json({ error: err.message || `WC ${res.status}` }, { status: codigo });
  }

  const data = await res.json().catch(() => null);

  // Confirmación por lectura posterior. El cuerpo del PUT no alcanza como prueba:
  //   - WooCommerce reemplaza en silencio un estado no registrado (WC_Abstract_Order
  //     ::set_status cae a 'pending'), y el PUT contesta 200.
  //   - Cualquier plugin colgado de woocommerce_order_status_* puede volver a mover
  //     el pedido después de guardarlo (el de Andreani y el de pagos lo hacen).
  //   - Un write que no llegó a persistir igual puede devolver el objeto en memoria.
  // Si el estado guardado no es el pedido, se informa el real y el panel se corrige
  // solo. Si no se pudo releer, se dice que no se pudo confirmar: nunca se afirma.
  const real = await leerEstado(orderId);

  if (real === null) {
    return NextResponse.json({
      ok: true,
      confirmado: false,
      status: typeof data?.status === 'string' ? data.status : status,
      aviso: `WooCommerce aceptó el cambio pero no pudimos releer el pedido #${orderId} para confirmarlo. Volvé a cargar la lista antes de seguir.`,
    });
  }

  if (real !== status) {
    return NextResponse.json(
      {
        error: `WooCommerce no guardó "${label(status)}": el pedido #${orderId} quedó en `
             + `"${label(real)}".`,
        status: real,
        confirmado: false,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, confirmado: true, status: real });
}
