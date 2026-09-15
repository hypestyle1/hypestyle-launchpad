import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { parseGatewaySnapshot, isSnapshotV2, GATEWAY_SYNC_META } from '@/lib/finance/gateway-snapshot';
import { providerOf, groupOf } from '@/lib/finance/fees';
import type { GatewaySyncStatus } from '@/lib/finance/types';
import { mpActivityUrl } from '@/lib/finance/mp-links';
import { parseRefundsMeta, parseRefundLock } from '@/lib/finance/mp-refund';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // _cb evita el caché de LiteSpeed en el server de WP, que puede devolver meta_data vieja.
  const [orderRes, notesRes] = await Promise.all([
    fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}?_cb=${Date.now()}`, {
      headers: { Authorization: wcAuth() },
      next: { revalidate: 0 },
    }),
    fetch(`${WP_URL}/wp-json/wc/v3/orders/${params.id}/notes?_cb=${Date.now()}`, {
      headers: { Authorization: wcAuth() },
      next: { revalidate: 0 },
    }),
  ]);

  if (!orderRes.ok) {
    return NextResponse.json({ error: `WC ${orderRes.status}` }, { status: orderRes.status === 404 ? 404 : 502 });
  }

  const o     = await orderRes.json();
  const notes = notesRes.ok ? await notesRes.json() : [];

  const getMeta = (key: string) =>
    (o.meta_data as any[])?.find((m: any) => m.key === key)?.value || '';

  // Cobro: id de pago de la pasarela + snapshot del desglose (comisión,
  // financiación, retenciones, neto) si el sync de MP ya lo guardó.
  const transactionId = String(o.transaction_id || '').trim();
  const snapshot = parseGatewaySnapshot(o.meta_data);
  let gatewaySync: GatewaySyncStatus | null = null;
  const rawSync = getMeta(GATEWAY_SYNC_META);
  if (rawSync) { try { gatewaySync = typeof rawSync === 'string' ? JSON.parse(rawSync) : rawSync; } catch { gatewaySync = null; } }
  const provider = providerOf(o.payment_method || '');
  const paymentId = (isSnapshotV2(snapshot) ? snapshot.paymentId : snapshot?.transactionId) || transactionId || '';
  const gateway = snapshot ? {
    version: isSnapshotV2(snapshot) ? 2 : 1,
    quality: isSnapshotV2(snapshot) ? snapshot.quality : 'real',
    gross: isSnapshotV2(snapshot) ? snapshot.gross : snapshot.grossAmount,
    feeGateway: isSnapshotV2(snapshot) ? snapshot.feeGateway : snapshot.gatewayFee,
    feeFinancing: isSnapshotV2(snapshot) ? snapshot.feeFinancing : 0,
    feeOther: isSnapshotV2(snapshot) ? snapshot.feeOther : 0,
    taxWithholdings: isSnapshotV2(snapshot) ? snapshot.taxWithholdings : [],
    taxWithholdingTotal: isSnapshotV2(snapshot) ? snapshot.taxWithholdingTotal : snapshot.otherCashDeduction,
    refunded: isSnapshotV2(snapshot) ? snapshot.refunded : 0,
    netReceived: snapshot.netReceived,
    installments: isSnapshotV2(snapshot) ? snapshot.installments : null,
    paymentMethodId: isSnapshotV2(snapshot) ? snapshot.paymentMethodId : null,
    paymentTypeId: isSnapshotV2(snapshot) ? snapshot.paymentTypeId : null,
    status: isSnapshotV2(snapshot) ? snapshot.status : null,
    dateApproved: isSnapshotV2(snapshot) ? snapshot.dateApproved : null,
    moneyReleaseDate: isSnapshotV2(snapshot) ? snapshot.moneyReleaseDate : null,
    moneyReleaseStatus: isSnapshotV2(snapshot) ? snapshot.moneyReleaseStatus : null,
    discrepancy: isSnapshotV2(snapshot) ? snapshot.discrepancy : null,
    warnings: isSnapshotV2(snapshot) ? snapshot.warnings : [],
    syncedAt: snapshot.syncedAt,
  } : null;

  // Historial del cliente: otros pedidos del mismo email (no hay customer_id, son todos guest checkout).
  let customerHistory = { orderCount: 0, totalSpent: 0, firstOrderDate: '' };
  if (o.billing.email) {
    const histRes = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?search=${encodeURIComponent(o.billing.email)}&per_page=50&orderby=date&order=asc&_cb=${Date.now()}`,
      { headers: { Authorization: wcAuth() }, next: { revalidate: 0 } }
    );
    // Solo cuentan pedidos efectivamente pagados — 'pending'/'failed' son carritos abandonados, no compras reales.
    const PAID_STATUSES = ['processing', 'on-hold', 'enviado', 'completed', 'refunded'];
    if (histRes.ok) {
      const histOrders = (await histRes.json() as any[])
        .filter((h: any) => h.id !== o.id && h.billing.email === o.billing.email && PAID_STATUSES.includes(h.status));
      customerHistory = {
        orderCount:     histOrders.length,
        totalSpent:     histOrders.reduce((s: number, h: any) => s + parseFloat(h.total), 0),
        firstOrderDate: histOrders[0]?.date_created || '',
      };
    }
  }

  return NextResponse.json({
    id:      o.id,
    number:  o.number,
    status:  o.status,
    date:    o.date_created,
    datePaid:     o.date_paid || '',
    dateModified: o.date_modified || '',
    customer: {
      first_name: o.billing.first_name,
      last_name:  o.billing.last_name,
      email:      o.billing.email,
      phone:      o.billing.phone,
      dni:        getMeta('_billing_dni'),
      instagram:  getMeta('_instagram'),
    },
    customerHistory,
    billing: {
      address_1: o.billing.address_1,
      address_2: o.billing.address_2,
      city:      o.billing.city,
      state:     o.billing.state,
      postcode:  o.billing.postcode,
    },
    shipping: {
      first_name: o.shipping.first_name,
      last_name:  o.shipping.last_name,
      address_1:  o.shipping.address_1,
      address_2:  o.shipping.address_2,
      city:       o.shipping.city,
      state:      o.shipping.state,
      postcode:   o.shipping.postcode,
    },
    items: (o.line_items as any[]).map((i: any) => ({
      id:       i.id,
      name:     i.name,
      quantity: i.quantity,
      // subtotal (no total) = precio de lista antes del cupón. WC prorratea el
      // descuento de cupones fixed_cart entre los ítems y lo refleja en price/total,
      // así que usar esos campos hace ver cada prenda "regalada" — el descuento real
      // ya se muestra aparte como una sola línea (discount_total).
      price:    parseFloat(i.subtotal) / i.quantity,
      total:    parseFloat(i.subtotal),
      image:    i.image?.src || '',
      size:     (i.meta_data as any[])?.find((m: any) =>
        ['talle', 'pa_talle', 'size', 'pa_size'].includes((m.key || '').toLowerCase())
      )?.value || '',
      color:    (i.meta_data as any[])?.find((m: any) =>
        ['color', 'pa_color'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalName:   (i.meta_data as any[])?.find((m: any) =>
        ['nombre dorsal', 'player name'].includes((m.key || '').toLowerCase())
      )?.value || '',
      dorsalNumber: (i.meta_data as any[])?.find((m: any) =>
        ['número dorsal', 'numero dorsal', 'number'].includes((m.key || '').toLowerCase())
      )?.value || '',
    })),
    shipping_lines: (o.shipping_lines as any[]).map((s: any) => ({
      method_title: s.method_title,
      total:        parseFloat(s.total),
    })),
    total:                parseFloat(o.total),
    shipping_total:       parseFloat(o.shipping_total),
    discount_total:       parseFloat(o.discount_total),
    feeLines: (o.fee_lines as any[])?.map((f: any) => ({ id: f.id, name: f.name, total: parseFloat(f.total) })) || [],
    isMayorista: getMeta('_es_mayorista') === 'true',
    isGift: getMeta('_es_regalo') === 'true',
    payment_method:       o.payment_method,
    payment_method_title: o.payment_method_title,
    payment: {
      provider,
      group: groupOf(provider),
      transactionId,
      paymentId,
      mpUrl: groupOf(provider) === 'mercadopago' && paymentId ? mpActivityUrl(paymentId) : null,
      gateway,
      sync: gatewaySync,
      // Refunds: historial propio (`_hs_refunds`), lo que Woo registró y si hay
      // un intento en curso. El "disponible" canónico lo da GET .../refund
      // (fresco de MP); esto es lo persistido, para pintar sin esperar a MP.
      refunds: parseRefundsMeta(o.meta_data),
      wooRefunds: ((o.refunds as any[]) || []).map((r: any) => ({ id: Number(r.id), total: Math.abs(Number(r.total) || 0), reason: String(r.reason || '') })),
      refundLock: parseRefundLock(o.meta_data),
    },
    customer_note:        o.customer_note,
    adminNote:            getMeta('_hs_admin_note'),
    order_key:            o.order_key,
    viaCargoSucursal: getMeta('_via_cargo_sucursal'),
    tracking:   getMeta('_tracking_number'),
    notified:   getMeta('_tracking_notified'),
    andreani:   getMeta('_andreani_numero_de_envio') || getMeta('_andreani_remito'),
    pedido_id:  getMeta('_order_andreani_pedido_id'),
    hsDispatchedAt:     getMeta('_hs_dispatched_at'),
    hsDispatchedSource: getMeta('_hs_dispatched_source'),
    notes: (notes as any[])
      .filter((n: any) => n.author && n.author !== 'system')
      .map((n: any) => ({ id: n.id, note: n.note, date: n.date_created, customer_note: n.customer_note })),
  });
}
