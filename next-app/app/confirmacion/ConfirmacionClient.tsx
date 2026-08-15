'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearCartSnapshot } from '@/lib/cart-recovery';
import { gaPurchase } from '@/lib/ga';

interface OrderData {
  wcOrderId?: number; wcOrderNumber?: string; orderKey?: string; orderNum: string | number;
  items: { id?: string; name: string; price: number; quantity: number; size: string; image: string }[];
  total: number; email: string; nombre: string; apellido: string; ciudad: string; provincia: string;
  metodo?: string; pais?: string; telefono?: string;
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '412944573148639';

// Estados de MercadoPago que NO son un pago rechazado. Cuando no viene ningún
// estado en la URL (transferencia, PayPal, internacional) se asume el camino
// normal: la orden se creó y el pago se resuelve por su propio canal.
const MP_OK_STATUSES = ['approved', 'authorized', 'pending', 'in_process', 'in_mediation'];

function paymentStateFrom(status: string | null): 'approved' | 'pending' | 'rejected' {
  if (!status) return 'approved';
  if (status === 'pending' || status === 'in_process') return 'pending';
  return MP_OK_STATUSES.includes(status) ? 'approved' : 'rejected';
}

export default function ConfirmacionClient() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const params = new URLSearchParams(window.location.search);
    const estado = paymentStateFrom(params.get('collection_status') || params.get('status'));

    // Pago rechazado: la copia del carrito se deja intacta para que /checkout la
    // restaure cuando el cliente vuelva a intentar. Solo se descarta cuando el
    // pago quedó efectivamente cursado. Ver lib/cart-recovery.ts.
    if (estado !== 'rejected') clearCartSnapshot();

    const raw = sessionStorage.getItem('hype_order');
    const parsed: OrderData | null = raw ? JSON.parse(raw) : null;
    if (parsed) setOrder(parsed);

    // El Purchase del pixel solo se dispara con un pago que efectivamente cursó:
    // reportarlo con la tarjeta rechazada infla las conversiones de Meta y ensucia
    // la optimización de la campaña.
    if (parsed && estado !== 'rejected') {
      sessionStorage.removeItem('hype_order');

      const purchasePayload = {
        value: parsed.total,
        currency: 'ARS',
        contents: parsed.items.map(i => ({ id: i.name, quantity: i.quantity })),
        content_type: 'product',
        order_id: String(parsed.wcOrderNumber || parsed.orderNum),
      };
      const eventID = String(parsed.wcOrderId ?? parsed.wcOrderNumber ?? parsed.orderNum ?? '');
      // Advanced Matching: en esta pantalla ya conocemos datos reales del comprador
      // (a diferencia del init genérico en MetaPixel.tsx). Re-inicializar con estos
      // datos antes del Purchase mejora el match rate del evento server+browser.
      const advancedMatching = {
        em: parsed.email || undefined,
        ph: parsed.telefono ? parsed.telefono.replace(/[^\d]/g, '') : undefined,
        fn: parsed.nombre || undefined,
        ln: parsed.apellido || undefined,
        ct: parsed.ciudad || undefined,
        st: parsed.provincia || undefined,
        country: parsed.pais ? parsed.pais.toLowerCase() : undefined,
      };
      const firePurchase = (attempts = 0) => {
        if (window.fbq) {
          window.fbq('init', PIXEL_ID, advancedMatching);
          window.fbq('track', 'Purchase', purchasePayload, eventID ? { eventID } : undefined);
        } else if (attempts < 40) {
          setTimeout(() => firePurchase(attempts + 1), 200);
        }
      };
      firePurchase();
    }

    // --- purchase de GA4 ---------------------------------------------------
    // Criterio deliberadamente MÁS estricto que el Purchase del pixel de arriba.
    // El pixel dispara con cualquier estado que no sea "rechazado", lo que incluye
    // transferencia (el cliente todavía no transfirió) y MP en "pending". GA4 es la
    // fuente que vamos a usar para decidir pauta, así que acá se aplica la misma
    // regla que el mail de confirmación (PR #184): no hay venta hasta que el pago
    // está efectivamente acreditado.
    //
    //   MercadoPago / tarjeta → collection_status=approved en la vuelta
    //   GOcuotas              → gocuotas=approved (solo redirige acá si aprobó)
    //   PayPal                → recién cuando /api/paypal-capture confirma el capture
    //   Transferencia         → nunca desde el browser; la acredita el back manualmente
    const gaPurchaseFor = (o: OrderData) => {
      gaPurchase({
        transactionId: String(o.wcOrderNumber || o.orderNum),
        value: o.total,
        items: o.items.map(i => ({
          item_id: i.id || i.name,
          item_name: i.name,
          item_variant: i.size,
          price: i.price,
          quantity: i.quantity,
        })),
      });
    };

    const mpApproved = (params.get('collection_status') || params.get('status')) === 'approved';
    const gcApproved = params.get('gocuotas') === 'approved';
    if (parsed && (mpApproved || gcApproved)) gaPurchaseFor(parsed);

    setFecha(new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }));

    const paymentId  = params.get('collection_id') || params.get('payment_id');
    const externalRef = params.get('external_reference');
    const mpStatus   = params.get('collection_status') || params.get('status');
    if (paymentId && externalRef && mpStatus === 'approved') {
      fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, order_id: parseInt(externalRef, 10), status: 'approved' }),
      })
        .catch(() => {})
        // Una vez marcada como paga, dispara el mail de confirmación (idempotente).
        // El webhook de WP es el respaldo si el cliente no vuelve a esta página.
        .finally(() => {
          fetch(`/api/confirm-paid?order=${parseInt(externalRef, 10)}`).catch(() => {});
        });
    }

    // La captura se dispara con el `token` de PayPal (el id de la orden) y nada
    // más. Antes exigía además `PayerID` y `order`: si la vuelta no traía los
    // tres, el pago aprobado nunca se capturaba y el pedido quedaba en `pending`
    // para siempre, sin un solo rastro de por qué. Ninguno de los dos hacía
    // falta — `PayerID` no se usa en ningún lado, y el pedido de WooCommerce lo
    // resuelve el servidor leyendo el `reference_id` de la propia orden de
    // PayPal, que es la fuente de verdad (ver /api/paypal-capture).
    const ppToken        = params.get('token');
    const wcOrderIdParam = params.get('order');
    if (ppToken) {
      const wcOrderIdParsed = wcOrderIdParam ? parseInt(wcOrderIdParam, 10) : NaN;
      fetch('/api/paypal-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypalOrderId: ppToken,
          ...(Number.isFinite(wcOrderIdParsed) ? { wcOrderId: wcOrderIdParsed } : {}),
        }),
      })
        // PayPal es asíncrono: la vuelta a esta pantalla no significa que el pago
        // haya cursado. El purchase de GA4 espera a que el capture responda OK.
        .then(res => { if (res.ok && parsed) gaPurchaseFor(parsed); })
        .catch(() => {});
    }
  }, []);

  const mpStatus        = searchParams.get('collection_status') || searchParams.get('status');
  const mpOrderId       = searchParams.get('external_reference') || searchParams.get('order_id');
  const displayOrderNum = order?.wcOrderNumber || order?.orderNum || mpOrderId || '—';
  const isIntl          = !!(order?.pais && order.pais !== 'AR');
  const estado          = paymentStateFrom(mpStatus);
  const isRejected      = estado === 'rejected';
  const isPending       = estado === 'pending';

  const t = {
    orderLabel:   isIntl ? 'Order'            : 'Pedido',
    thanks: isRejected
      ? (isIntl ? 'Your payment could not be completed' : 'El pago no se completó')
      : isPending
        ? (isIntl ? 'We are confirming your payment' : 'Estamos confirmando tu pago')
        : (isIntl ? 'Thank you for your order!' : '¡Gracias por tu compra!'),
    body: isRejected
      ? (isIntl
          ? 'Your order was created but the payment was rejected, so nothing was charged. You can try again with the same cart or choose a different payment method.'
          : 'Tu pedido quedó registrado pero el pago fue rechazado, así que no se te cobró nada. Podés intentar de nuevo con el mismo carrito o elegir otro medio de pago.')
      : isPending
        ? (isIntl
            ? 'Your order was created and the payment is still being processed. As soon as it clears we will send you the confirmation by email.'
            : 'Tu pedido quedó registrado y el pago todavía se está procesando. Apenas se acredite te mandamos el mail de confirmación.')
        : (isIntl
            ? "We've received your order and sent a confirmation to your email. It ships within 2 to 3 business days and you'll get the FedEx tracking number by email."
            : 'Te enviamos un email con la confirmación y los detalles del pedido. Preparamos tu orden y te avisamos cuando esté en camino.'),
    retry:   isIntl ? 'Try the payment again' : 'Reintentar el pago',
    contact: isIntl ? 'Questions? Chat with us on ' : 'Ante cualquier duda escribinos por ',
    sectionTitle: isIntl ? 'Order details'   : 'Información del pedido',
    orderNumber:  isIntl ? 'Order number'    : 'Número de pedido',
    date:         isIntl ? 'Date'            : 'Fecha',
    shipping:     isIntl ? 'Shipping'        : 'Envío',
    shippingVal:  isIntl
      ? 'FedEx International — tracked and insured'
      : 'Andreani — 5 a 10 días hábiles',
    cta:          isIntl ? 'Continue shopping' : 'Seguir comprando',
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-[540px] w-full text-center">

          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isRejected ? 'bg-red-100' : isPending ? 'bg-amber-100' : 'bg-green-100'
          }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke={isRejected ? '#dc2626' : isPending ? '#d97706' : '#16a34a'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isRejected ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : isPending ? (
                <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>
              ) : (
                <polyline points="20 6 9 17 4 12" />
              )}
            </svg>
          </div>

          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {t.orderLabel} #{displayOrderNum}
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold leading-tight mb-4">{t.thanks}</h1>

          <p className="text-[14px] text-muted-foreground leading-relaxed mb-2">{t.body}</p>

          {isIntl && !isRejected && (
            <div className="mx-auto max-w-[400px] bg-foreground/[0.03] border border-border rounded-[10px] px-5 py-3.5 mb-6 text-left">
              <p className="text-[12px] text-foreground/60 leading-relaxed">
                <span className="text-foreground font-semibold">Shipping is already included</span>
                {' '}in what you paid. Import duties and customs fees at destination are separate and are paid
                by the recipient.
              </p>
            </div>
          )}

          <p className="text-[13px] text-muted-foreground mb-10">
            {t.contact}
            <a href="https://wa.me/5491178292430?text=Hola%20Hype!" target="_blank" rel="noopener noreferrer"
               className="underline hover:text-foreground transition-colors">WhatsApp</a>
          </p>

          <div className="border-t border-border pt-8 mb-8 text-left space-y-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">{t.sectionTitle}</p>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">{t.orderNumber}</span>
              <span className="font-semibold">#{displayOrderNum}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">{t.date}</span>
              <span>{fecha}</span>
            </div>
            {order?.email && (
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate ml-4 text-right">{order.email}</span>
              </div>
            )}
            {mpStatus && mpStatus !== 'approved' && (
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Estado MP</span>
                <span className="capitalize">{mpStatus}</span>
              </div>
            )}
            {/* Con el pago rechazado no hay nada que despachar todavía — prometer
                un plazo de entrega acá confunde. */}
            {!isRejected && (
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">{t.shipping}</span>
                <span className="text-right ml-4">{t.shippingVal}</span>
              </div>
            )}
          </div>

          {isRejected ? (
            <div className="flex flex-col items-center gap-3">
              <a href="/checkout/" className="inline-flex items-center gap-2 bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors">
                {t.retry}
              </a>
              <a href="/" className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                {t.cta}
              </a>
            </div>
          ) : (
            <a href="/" className="inline-flex items-center gap-2 bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors">
              {t.cta}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
