'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearCartSnapshot } from '@/lib/cart-recovery';
import { gaPurchase } from '@/lib/ga';
import { ReceiptPrinter, type ReceiptStage } from '@/components/ReceiptPrinter';
import { GiftCard } from '@/components/GiftCard';
import { GIFT_CARD_SLUG } from '@/lib/gift-card';
import { DynamicButton } from '@/components/ui/dynamic-button';

type GiftCode = { code: string; monto: number; para_email?: string; para_nombre?: string; saldo?: number };

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
  // El pago aprobado arranca "imprimiendo" y pasa a "listo" cuando el papel
  // terminó de salir (misma duración que `hs-receipt-feed` en globals.css).
  // Pendiente y rechazado no imprimen nada: no hay comprobante que dar todavía.
  const [impreso, setImpreso] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setImpreso(true), 1900);
    return () => window.clearTimeout(t);
  }, []);

  // Gift cards del pedido. El código lo emite el mu-plugin cuando el pago se
  // acredita, que puede llegar unos segundos después de volver acá: se
  // consulta cada 3 s hasta que estén (o hasta 45 s). El dorso de la tarjeta se
  // muestra recién con el código real.
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [giftDorso, setGiftDorso] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!order?.wcOrderId || !order.orderKey) return;
    if (!order.items.some(i => i.id === GIFT_CARD_SLUG || /gift card/i.test(i.name))) return;
    let intentos = 0;
    let timer = 0;
    const consultar = async () => {
      try {
        const r = await fetch(`/api/gift-card-codes?order=${order.wcOrderId}&key=${encodeURIComponent(order.orderKey!)}`);
        const d = await r.json();
        if (r.ok && d.issued && Array.isArray(d.codes) && d.codes.length) { setGiftCodes(d.codes); return; }
      } catch { /* reintenta */ }
      if (++intentos < 15) timer = window.setTimeout(consultar, 3000);
    };
    consultar();
    return () => window.clearTimeout(timer);
  }, [order]);

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
    // Quien acaba de comprar no quiere volver a comprar ya: vuelve al home.
    cta:          isIntl ? 'Back to home' : 'Volver al home',
  };

  const stage: ReceiptStage = isRejected
    ? 'rechazado'
    : isPending
      ? 'procesando'
      : impreso
        ? 'listo'
        : 'imprimiendo';

  const money = (n: number) =>
    new Intl.NumberFormat(isIntl ? 'en-US' : 'es-AR', {
      style: 'currency',
      currency: isIntl ? 'USD' : 'ARS',
      maximumFractionDigits: 0,
    }).format(n);

  const subtotal = order?.items.reduce((acc, i) => acc + i.price * i.quantity, 0) ?? 0;
  const envio = order ? Math.max(0, order.total - subtotal) : 0;

  const statusLabel = isRejected
    ? (isIntl ? 'Payment declined' : 'Pago rechazado')
    : isPending
      ? (isIntl ? 'Confirming your payment' : 'Confirmando el pago')
      : impreso
        ? (isIntl ? 'Order confirmed' : 'Compra confirmada')
        : (isIntl ? 'Printing your receipt' : 'Imprimiendo tu comprobante');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-12 md:py-16">
        <div className="max-w-[540px] w-full text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {t.orderLabel} #{displayOrderNum}
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold leading-tight mb-4">{t.thanks}</h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">{t.body}</p>
        </div>

        <ReceiptPrinter stage={stage}>
          <ReceiptPrinter.Machine>
            <ReceiptPrinter.Header>
              <img src="/logo-hypestyle-2026.png" alt="" className="h-4 w-auto invert" />
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/40">
                #{displayOrderNum}
              </span>
            </ReceiptPrinter.Header>
            <ReceiptPrinter.Screen>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-4 font-mono text-[12px]">
                  <span className="text-white/60">{fecha}</span>
                  {order && <strong className="text-[14px]">{money(order.total)}</strong>}
                </div>
                <ReceiptPrinter.Status>{statusLabel}</ReceiptPrinter.Status>
              </div>
            </ReceiptPrinter.Screen>
          </ReceiptPrinter.Machine>

          <ReceiptPrinter.Output>
            <ReceiptPrinter.Paper>
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-black/50">
                {isIntl ? 'Receipt' : 'Comprobante'}
              </p>
              <p className="text-center font-bold mt-1">HYPESTYLE</p>
              <p className="text-center text-[11px] text-black/60">Buenos Aires — Est. 2018</p>

              <div className="my-4 border-t border-dashed border-black/30" />

              <dl className="space-y-1 text-[12px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-black/60">{t.orderNumber}</dt>
                  <dd className="font-semibold">#{displayOrderNum}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-black/60">{t.date}</dt>
                  <dd>{fecha}</dd>
                </div>
                {order?.email && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-black/60">Email</dt>
                    <dd className="truncate text-right">{order.email}</dd>
                  </div>
                )}
              </dl>

              {order && order.items.length > 0 && (
                <>
                  <div className="my-4 border-t border-dashed border-black/30" />
                  <ul className="space-y-2 text-[12px]">
                    {order.items.map((item, i) => (
                      <li key={`${item.id ?? item.name}-${item.size}-${i}`} className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate uppercase">{item.name}</p>
                          <p className="text-black/60">
                            {item.size ? `${isIntl ? 'Size' : 'Talle'} ${item.size} · ` : ''}
                            {item.quantity} x {money(item.price)}
                          </p>
                        </div>
                        <span className="shrink-0">{money(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="my-4 border-t border-dashed border-black/30" />
                  <dl className="space-y-1 text-[12px]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-black/60">Subtotal</dt>
                      <dd>{money(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-black/60">{t.shipping}</dt>
                      <dd>{envio > 0 ? money(envio) : (isIntl ? 'Included' : 'Incluido')}</dd>
                    </div>
                    <div className="flex justify-between gap-4 pt-1 text-[14px] font-bold">
                      <dt>Total</dt>
                      <dd>{money(order.total)}</dd>
                    </div>
                  </dl>
                </>
              )}

              <div className="my-4 border-t border-dashed border-black/30" />
              <p className="text-[11px] text-black/60 leading-relaxed">{t.shippingVal}</p>
              {isIntl && (
                <p className="mt-2 text-[11px] text-black/60 leading-relaxed">
                  Shipping is included. Import duties at destination are paid by the recipient.
                </p>
              )}
              <p className="mt-5 text-center text-[11px] uppercase tracking-[0.15em]">
                {isIntl ? 'Thank you' : 'Gracias'}
              </p>
            </ReceiptPrinter.Paper>
          </ReceiptPrinter.Output>
        </ReceiptPrinter>

        {giftCodes.length > 0 && !isRejected && (
          <div className="max-w-[420px] w-full mt-12">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground text-center mb-5">
              {giftCodes.length === 1 ? 'Tu gift card' : 'Tus gift cards'} · tocá para ver el código
            </p>
            <div className="space-y-6">
              {giftCodes.map(c => (
                <div key={c.code}>
                  <GiftCard
                    monto={c.monto}
                    codigo={c.code}
                    dorso={!!giftDorso[c.code]}
                    onClick={() => setGiftDorso(d => ({ ...d, [c.code]: !d[c.code] }))}
                    className="cursor-pointer"
                  />
                  {c.para_email && (
                    <p className="mt-2 text-center text-[12px] text-muted-foreground">
                      También se la mandamos a {c.para_nombre || c.para_email}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-[12px] text-muted-foreground leading-relaxed">
              Te llegó por mail. Se carga en el checkout, en el campo de código de descuento. No vence.
            </p>
          </div>
        )}

        <div className="max-w-[540px] w-full text-center mt-10">
          <p className="text-[13px] text-muted-foreground mb-8">
            {t.contact}
            <a href="https://wa.me/5491178292430?text=Hola%20Hype!" target="_blank" rel="noopener noreferrer"
               className="underline hover:text-foreground transition-colors">WhatsApp</a>
          </p>

          {isRejected ? (
            <div className="flex flex-col items-center gap-3">
              <DynamicButton
                onClick={() => { window.location.href = '/checkout/'; }}
                className="bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] rounded-[8px] hover:bg-bg-dark/85"
              >
                {t.retry}
              </DynamicButton>
              <a href="/" className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                {t.cta}
              </a>
            </div>
          ) : (
            <DynamicButton
              onClick={() => { window.location.href = '/'; }}
              className="bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] rounded-[8px] hover:bg-bg-dark/85"
            >
              {t.cta}
            </DynamicButton>
          )}
        </div>
      </div>
    </div>
  );
}
