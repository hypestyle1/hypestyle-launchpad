import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';
import { paypalAccessToken, getPayPalOrder, capturePayPalOrder } from '@/lib/paypal';
import { wcNote } from '@/lib/wc-admin';

/**
 * Captura el pago de PayPal cuando el cliente vuelve a /confirmacion.
 *
 * Quién manda es PayPal, no el request: la orden se crea con
 * `reference_id = wcOrderId` (ver /api/paypal-order), así que el pedido de
 * WooCommerce sale siempre del `reference_id`. Sin eso, un atacante podía pagar
 * su propio pedido barato y después llamar acá con ese paypalOrderId ya pagado
 * pero mandando el wcOrderId de un pedido ajeno caro. Por eso `wcOrderId` en el
 * body pasó a ser OPCIONAL: cuando viene se usa sólo como verificación cruzada,
 * y cuando no viene el capture igual funciona. Antes era obligatorio, y eso
 * convertía cualquier vuelta de PayPal sin el query param en un pago perdido.
 */
export async function POST(req: NextRequest) {
  try {
    const { paypalOrderId, wcOrderId } = await req.json() as { paypalOrderId: string; wcOrderId?: number };
    if (!paypalOrderId) {
      return NextResponse.json({ error: 'paypalOrderId requerido' }, { status: 400 });
    }
    const claimed = Number(wcOrderId);
    const hasClaim = Number.isFinite(claimed) && claimed > 0;

    const token = await paypalAccessToken();

    // Se verifica ANTES de capturar: si el pedido no coincide, no se cobra nada.
    const ppOrder = await getPayPalOrder(paypalOrderId, token);
    if (!ppOrder || ppOrder.wcOrderId === null) {
      console.error('[paypal-capture] no se pudo leer la orden de PayPal', paypalOrderId);
      return NextResponse.json({ error: 'No se pudo verificar el pago con PayPal' }, { status: 502 });
    }
    if (hasClaim && ppOrder.wcOrderId !== claimed) {
      console.error('[paypal-capture] reference_id', ppOrder.wcOrderId, '!= wcOrderId', claimed);
      return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 });
    }
    const target = ppOrder.wcOrderId;

    // Si ya estaba capturada (el webhook o la reconciliación llegaron primero,
    // o el cliente recargó la pantalla), no es un error: falta registrarlo.
    if (ppOrder.status === 'COMPLETED') {
      const already = await fulfillOrder(target, 'paypal', paypalOrderId);
      return NextResponse.json({ success: true, paypalOrderId, wcOrderId: target, fulfill: already.reason });
    }

    const capture = await capturePayPalOrder(paypalOrderId, token);
    if (!capture.ok) {
      if (capture.error === 'ORDER_ALREADY_CAPTURED') {
        const already = await fulfillOrder(target, 'paypal', paypalOrderId);
        return NextResponse.json({ success: true, paypalOrderId, wcOrderId: target, fulfill: already.reason });
      }
      console.error('[paypal-capture] capture failed:', capture.error);
      await wcNote(target, `PayPal: falló la captura de la orden ${paypalOrderId} (${capture.error}). El pedido queda sin cobrar.`);
      return NextResponse.json({ error: 'No se pudo capturar el pago PayPal' }, { status: 500 });
    }

    if (capture.status !== 'COMPLETED') {
      await wcNote(target, `PayPal: la captura de ${paypalOrderId} devolvió estado ${capture.status}.`);
      return NextResponse.json({ error: `Estado inesperado: ${capture.status}` }, { status: 400 });
    }

    // Segunda pasada sobre la respuesta del capture (no sólo sobre el GET previo),
    // por si la orden se modificó entre una llamada y la otra.
    if (capture.wcOrderId !== null && capture.wcOrderId !== undefined && capture.wcOrderId !== target) {
      console.error('[paypal-capture] reference_id del capture', capture.wcOrderId, '!= ', target);
      return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 });
    }

    // Recién acá el pago está confirmado — marca la orden como processing y
    // manda la confirmación real al cliente (antes de esto, create-order-intl/
    // create-order-gocuotas NO mandan mail de "pago recibido" para PayPal).
    const result = await fulfillOrder(target, 'paypal', paypalOrderId);
    if (!result.ok) {
      console.error('[paypal-capture] fulfill failed:', result.reason);
      await wcNote(target, `PayPal: pago capturado (${paypalOrderId}) pero falló marcar el pedido como pagado (${result.reason}). REVISAR A MANO.`);
    }

    return NextResponse.json({ success: true, paypalOrderId, wcOrderId: target, fulfill: result.reason });
  } catch (err) {
    console.error('[paypal-capture]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
