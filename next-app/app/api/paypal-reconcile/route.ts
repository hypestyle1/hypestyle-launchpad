import { NextRequest, NextResponse } from 'next/server';
import { fulfillOrder } from '@/lib/order-fulfill';
import { paypalAccessToken, paypalConfigured, getPayPalOrder, capturePayPalOrder } from '@/lib/paypal';
import { wcGet, wcNote, metaValue, PAYPAL_ORDER_META } from '@/lib/wc-admin';

/**
 * Reconciliación de pagos de PayPal — la red de seguridad del flujo.
 *
 * Por qué existe: entre que el cliente aprueba el pago en PayPal y que nosotros
 * lo capturamos hay un salto que depende del navegador del cliente (vuelve a
 * /confirmacion y ahí sale el fetch a /api/paypal-capture). Si cierra la ventana,
 * pierde señal, la vuelta no trae los query params esperados o el fetch falla,
 * el pago queda aprobado del lado de PayPal y el pedido en `pending` del nuestro,
 * **en silencio**. El respaldo previsto era /api/paypal-webhook, pero necesita
 * `PAYPAL_WEBHOOK_ID` —registrar la URL en el Developer Dashboard de PayPal— y
 * eso sigue sin hacerse, así que hoy el webhook rechaza todo por seguridad.
 *
 * Esta ruta cierra el mismo agujero sin depender de ese registro: recorre los
 * pedidos `pending` de PayPal y le pregunta a PayPal, pedido por pedido, qué
 * pasó realmente.
 *
 *   COMPLETED  → el dinero ya entró y nunca lo registramos: se marca pagado.
 *   APPROVED   → el cliente aprobó y la captura murió: se captura y se marca.
 *   otro       → el cliente nunca aprobó. Se deja como está (no es una venta).
 *
 * Corre por cron cada hora. También sirve como diagnóstico: la respuesta dice
 * exactamente cuántos pedidos estaban en cada estado.
 *
 * Sólo mira pedidos que tengan `_paypal_order_id`, que se empezó a guardar el
 * 14/08/2026 — los anteriores no son reconciliables desde acá porque nunca
 * guardamos el id de la orden de PayPal (hay que buscarlos a mano en el panel).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const SECRET = (process.env.CRON_SECRET || '').trim();
/** Ventana hacia atrás. Las órdenes de PayPal expiran, no tiene sentido ir más lejos. */
const DAYS_BACK = 30;

interface WcOrder {
  id: number;
  status: string;
  payment_method?: string;
  date_created?: string;
  meta_data?: { key: string; value: unknown }[];
}

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  // Fail closed: sin CRON_SECRET cargado el endpoint no se abre solo.
  if (!SECRET || provided !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'PayPal sin credenciales en este entorno' }, { status: 503 });
  }

  // `dry=1` reporta sin cobrar ni tocar nada. Es la forma de contestar "¿cuántos
  // pagos aprobados tenemos sin capturar?" antes de decidir capturarlos.
  const dryRun = req.nextUrl.searchParams.get('dry') === '1';

  const after = new Date(Date.now() - DAYS_BACK * 86400_000).toISOString().slice(0, 19);
  const orders = await wcGet<WcOrder[]>(`orders?per_page=100&status=pending&after=${after}`);
  if (!orders) {
    return NextResponse.json({ error: 'No se pudo leer WooCommerce' }, { status: 502 });
  }

  const candidates = orders.filter(o =>
    /paypal/i.test(String(o.payment_method || '')) && metaValue(o, PAYPAL_ORDER_META));

  const token = await paypalAccessToken();
  const result = {
    dryRun,
    revisados: candidates.length,
    pendientesSinRastro: orders.filter(o =>
      /paypal/i.test(String(o.payment_method || '')) && !metaValue(o, PAYPAL_ORDER_META)).length,
    cobradosYaRegistrados: 0,
    recuperadosYaCobrados: [] as number[],
    recuperadosCapturados: [] as number[],
    nuncaAprobados: 0,
    errores: [] as { wcOrderId: number; error: string }[],
  };

  for (const order of candidates) {
    const paypalOrderId = metaValue(order, PAYPAL_ORDER_META)!;
    try {
      const pp = await getPayPalOrder(paypalOrderId, token);
      if (!pp) {
        result.errores.push({ wcOrderId: order.id, error: 'no se pudo leer la orden en PayPal' });
        continue;
      }
      // El pedido de WooCommerce lo dice PayPal, igual que en el capture. Si no
      // coincide con el pedido que estamos mirando, algo se cruzó: no se toca.
      if (pp.wcOrderId !== null && pp.wcOrderId !== order.id) {
        result.errores.push({ wcOrderId: order.id, error: `reference_id ${pp.wcOrderId} no coincide` });
        continue;
      }

      if (pp.status === 'COMPLETED') {
        if (dryRun) { result.recuperadosYaCobrados.push(order.id); continue; }
        const f = await fulfillOrder(order.id, 'paypal', paypalOrderId);
        if (f.ok) {
          result.recuperadosYaCobrados.push(order.id);
          await wcNote(order.id, `PayPal: reconciliación — el pago ${paypalOrderId} ya estaba cobrado en PayPal y el pedido seguía pendiente. Marcado como pagado.`);
        } else {
          result.errores.push({ wcOrderId: order.id, error: `fulfill: ${f.reason}` });
        }
        continue;
      }

      if (pp.status === 'APPROVED') {
        if (dryRun) { result.recuperadosCapturados.push(order.id); continue; }
        const cap = await capturePayPalOrder(paypalOrderId, token);
        if (!cap.ok && cap.error !== 'ORDER_ALREADY_CAPTURED') {
          result.errores.push({ wcOrderId: order.id, error: `capture: ${cap.error}` });
          await wcNote(order.id, `PayPal: reconciliación — el cliente aprobó el pago ${paypalOrderId} pero la captura falló (${cap.error}).`);
          continue;
        }
        const f = await fulfillOrder(order.id, 'paypal', paypalOrderId);
        if (f.ok) {
          result.recuperadosCapturados.push(order.id);
          await wcNote(order.id, `PayPal: reconciliación — el cliente había aprobado el pago ${paypalOrderId} y la captura nunca se hizo. Capturado y marcado como pagado.`);
        } else {
          result.errores.push({ wcOrderId: order.id, error: `fulfill tras capturar: ${f.reason}` });
        }
        continue;
      }

      // CREATED / PAYER_ACTION_REQUIRED / VOIDED → el cliente no llegó a aprobar.
      result.nuncaAprobados++;
    } catch (err) {
      result.errores.push({ wcOrderId: order.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const recuperados = result.recuperadosYaCobrados.length + result.recuperadosCapturados.length;
  if (recuperados > 0) {
    console.log('[paypal-reconcile] pedidos recuperados:', recuperados, JSON.stringify(result));
  }
  return NextResponse.json(result);
}
