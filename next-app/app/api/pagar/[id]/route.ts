import { NextRequest, NextResponse } from 'next/server';
import { wcRequest, wcNote } from '@/lib/wc-admin';
import {
  loadOrderForKey, repagoCookie, repagoState, stockProblems, orderUpdateFor, transferPlan,
  REPAGO_METHODS, TRANSFER_ACCOUNT, type RepagoMethod, type WcOrderLike,
} from '@/lib/repago';
import { createRepagoPreference } from '@/lib/repago-mp';

export const dynamic = 'force-dynamic';

// Misma respuesta para pedido inexistente, clave incorrecta y link sin clave:
// no se puede usar esta ruta para averiguar qué pedidos existen.
const notFound = () => NextResponse.json({ error: 'not-found' }, { status: 404 });

const METHOD_LABEL: Record<RepagoMethod, string> = {
  transferencia: 'transferencia (manual)', tarjeta: 'tarjeta (Mercado Pago)', mercadopago: 'Mercado Pago',
};

/**
 * Inicia el cobro de un pedido existente con el medio elegido. No crea
 * pedidos ni manda mails: deja el pedido listo (medio de pago y 10% de
 * transferencia) y devuelve a dónde ir a pagar.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^\d{1,10}$/.test(params.id)) return notFound();
  const orderId = Number(params.id);

  const body = await req.json().catch(() => null);
  const method = body?.method as RepagoMethod;
  if (!REPAGO_METHODS.includes(method)) return NextResponse.json({ error: 'invalid-method' }, { status: 400 });

  // El pedido se vuelve a leer de Woo acá, no se confía en lo que mostró la página.
  const order = await loadOrderForKey(orderId, req.cookies.get(repagoCookie(orderId))?.value);
  if (!order) return notFound();

  const state = repagoState(order);
  if (state !== 'payable') return NextResponse.json({ error: state }, { status: 409 });

  const stock = await stockProblems(order);
  if (stock.length) return NextResponse.json({ error: 'stock', stock }, { status: 409 });

  const update = orderUpdateFor(order, method);
  if (!update) return NextResponse.json({ error: 'method-unavailable' }, { status: 409 });

  const saved = await wcRequest<WcOrderLike>('PUT', `orders/${orderId}`, update.body);
  if (!saved.ok || !saved.body) {
    console.error('[pagar] no se pudo actualizar el pedido', orderId, saved.status);
    return NextResponse.json({ error: 'update-failed' }, { status: 502 });
  }
  // Entre la lectura y el guardado pudo entrar un pago por otro lado.
  if (repagoState(saved.body) !== 'payable') return NextResponse.json({ error: repagoState(saved.body) }, { status: 409 });

  // Se cobra lo que Woo dice que vale el pedido después de guardar. Si no
  // coincide con lo que se le mostró al cliente, no se cobra.
  const total = Number(saved.body.total);
  if (!(total > 0) || Math.abs(total - update.expected) > 1) {
    console.error('[pagar] total inesperado en el pedido', orderId, 'esperado', update.expected, 'woo', total);
    await wcNote(orderId, `Re-pago frenado: al elegir ${METHOD_LABEL[method]} el total quedó en ${total} y se esperaba ${update.expected}. Revisar el pedido.`);
    return NextResponse.json({ error: 'total-mismatch' }, { status: 409 });
  }

  if (method === 'transferencia') {
    await wcNote(orderId, `Re-pago: el cliente eligió transferencia manual desde /pagar. Total a transferir: $${total}. Aprobar a mano cuando llegue el comprobante.`);
    return NextResponse.json({ method, total, account: TRANSFER_ACCOUNT, discount: transferPlan(saved.body).discount });
  }

  const site = (process.env.NEXT_PUBLIC_FRONTEND_URL || req.nextUrl.origin).replace(/\/$/, '');
  const initPoint = await createRepagoPreference(saved.body, total, site);
  if (!initPoint) return NextResponse.json({ error: 'gateway' }, { status: 502 });

  await wcNote(orderId, `Re-pago: el cliente inició el pago con ${METHOD_LABEL[method]} desde /pagar por $${total}.`);
  return NextResponse.json({ method, total, redirect: initPoint });
}
