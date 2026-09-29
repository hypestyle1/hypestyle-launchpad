/**
 * Preferencia de Mercado Pago para un pedido que ya existe (/pagar/<id>).
 *
 * Es la misma preferencia que arma /api/mp-preference para el checkout
 * (mismo external_reference, mismo webhook, mismas cuotas), con dos
 * diferencias: los retornos vuelven a /pagar en vez de a /checkout —volver al
 * checkout crearía un pedido nuevo—, y ninguna URL lleva la order_key.
 * Vive aparte para no tocar la ruta del checkout.
 */

import type { WcOrderLike } from '@/lib/repago';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

export async function createRepagoPreference(order: WcOrderLike, total: number, siteUrl: string): Promise<string | null> {
  const token = process.env.MP_ACCESS_TOKEN || '';
  if (!token) return null;

  const shipping = Math.max(0, Number(order.shipping_total || 0));
  const itemsTotal = Math.round((total - shipping) * 100) / 100;
  if (!(total > 0) || itemsTotal < 0) return null;

  const numero = order.number || order.id;
  const items: Record<string, unknown>[] = [];
  if (itemsTotal > 0) items.push({ id: `pedido-${order.id}`, title: `Pedido #${numero} — Hypestyle`, quantity: 1, unit_price: itemsTotal, currency_id: 'ARS' });
  if (shipping > 0) items.push({ id: 'envio', title: 'Envío — Andreani', quantity: 1, unit_price: shipping, currency_id: 'ARS' });

  const success = `${siteUrl}/confirmacion/?order=${order.id}`;
  const preference = {
    items,
    external_reference: String(order.id),
    back_urls: {
      success,
      pending: `${siteUrl}/pagar/${order.id}?mp=pendiente`,
      failure: `${siteUrl}/pagar/${order.id}?mp=rechazado`,
    },
    // MP rechaza auto_return si la vuelta no es https (pasa en local).
    ...(success.startsWith('https://') && { auto_return: 'approved' }),
    notification_url: `${WP_URL}/wp-json/hypestyle/v1/mp-webhook`,
    payer: {
      email:   order.billing?.email || '',
      name:    order.billing?.first_name || '',
    },
    payment_methods: { installments: 3 },
  };

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(preference),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.init_point) {
    console.error('[pagar] MP error:', res.status, data?.message || '');
    return null;
  }
  return String(data.init_point);
}
