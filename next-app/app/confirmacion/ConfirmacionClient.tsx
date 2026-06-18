'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface OrderData {
  wcOrderId?: number; wcOrderNumber?: string; orderKey?: string; orderNum: string | number;
  items: { name: string; price: number; quantity: number; size: string; image: string }[];
  total: number; email: string; nombre: string; apellido: string; ciudad: string; provincia: string;
  metodo?: string; pais?: string;
}

export default function ConfirmacionClient() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const raw = sessionStorage.getItem('hype_order');
    if (raw) {
      const parsed: OrderData = JSON.parse(raw);
      setOrder(parsed);
      sessionStorage.removeItem('hype_order');

      const purchasePayload = {
        value: parsed.total,
        currency: 'ARS',
        contents: parsed.items.map(i => ({ id: i.name, quantity: i.quantity })),
        content_type: 'product',
        order_id: String(parsed.wcOrderNumber || parsed.orderNum),
      };
      const eventID = String(parsed.wcOrderId ?? parsed.wcOrderNumber ?? parsed.orderNum ?? '');
      const firePurchase = (attempts = 0) => {
        if (window.fbq) {
          window.fbq('track', 'Purchase', purchasePayload, eventID ? { eventID } : undefined);
        } else if (attempts < 40) {
          setTimeout(() => firePurchase(attempts + 1), 200);
        }
      };
      firePurchase();
    }
    setFecha(new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }));

    const params = new URLSearchParams(window.location.search);

    const paymentId  = params.get('collection_id') || params.get('payment_id');
    const externalRef = params.get('external_reference');
    const mpStatus   = params.get('collection_status') || params.get('status');
    if (paymentId && externalRef && mpStatus === 'approved') {
      fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, order_id: parseInt(externalRef, 10), status: 'approved' }),
      }).catch(() => {});
    }

    const ppToken        = params.get('token');
    const payerId        = params.get('PayerID');
    const wcOrderIdParam = params.get('order');
    if (ppToken && payerId && wcOrderIdParam) {
      fetch('/api/paypal-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paypalOrderId: ppToken, wcOrderId: parseInt(wcOrderIdParam, 10) }),
      }).catch(() => {});
    }
  }, []);

  const mpStatus        = searchParams.get('collection_status') || searchParams.get('status');
  const mpOrderId       = searchParams.get('external_reference') || searchParams.get('order_id');
  const displayOrderNum = order?.wcOrderNumber || order?.orderNum || mpOrderId || '—';
  const isIntl          = !!(order?.pais && order.pais !== 'AR');

  const t = {
    orderLabel:   isIntl ? 'Order'            : 'Pedido',
    thanks:       isIntl ? 'Thank you for your order!' : '¡Gracias por tu compra!',
    body: isIntl
      ? "We've received your order and sent a confirmation to your email. Your DHL shipping cost and estimated delivery time will be confirmed within 24 hours."
      : 'Te enviamos un email con la confirmación y los detalles del pedido. Preparamos tu orden y te avisamos cuando esté en camino.',
    contact: isIntl ? 'Questions? Chat with us on ' : 'Ante cualquier duda escribinos por ',
    sectionTitle: isIntl ? 'Order details'   : 'Información del pedido',
    orderNumber:  isIntl ? 'Order number'    : 'Número de pedido',
    date:         isIntl ? 'Date'            : 'Fecha',
    shipping:     isIntl ? 'Shipping'        : 'Envío',
    shippingVal:  isIntl
      ? 'DHL Express — final quote confirmed by email within 24 h'
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

          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {t.orderLabel} #{displayOrderNum}
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold leading-tight mb-4">{t.thanks}</h1>

          <p className="text-[14px] text-muted-foreground leading-relaxed mb-2">{t.body}</p>

          {isIntl && (
            <div className="mx-auto max-w-[400px] bg-foreground/[0.03] border border-border rounded-[10px] px-5 py-3.5 mb-6 text-left">
              <p className="text-[12px] text-foreground/60 leading-relaxed">
                <span className="text-foreground font-semibold">Final DHL shipping quote</span>
                {' '}will be confirmed by email after purchase. Your order won&apos;t ship until you approve the quote.
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
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">{t.shipping}</span>
              <span className="text-right ml-4">{t.shippingVal}</span>
            </div>
          </div>

          <a href="/" className="inline-flex items-center gap-2 bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors">
            {t.cta}
          </a>
        </div>
      </div>
    </div>
  );
}
