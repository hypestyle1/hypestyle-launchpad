'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface OrderData {
  wcOrderId?: number; wcOrderNumber?: string; orderNum: string | number;
  items: { name: string; price: number; quantity: number; size: string; image: string }[];
  total: number; email: string; nombre: string; apellido: string; ciudad: string; provincia: string;
}

export default function ConfirmacionClient() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const raw = sessionStorage.getItem('hype_order');
    if (raw) { setOrder(JSON.parse(raw)); sessionStorage.removeItem('hype_order'); }
    setFecha(new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }));
  }, []);

  const mpStatus  = searchParams.get('collection_status') || searchParams.get('status');
  const mpOrderId = searchParams.get('external_reference') || searchParams.get('order_id');
  const displayOrderNum = order?.wcOrderNumber || order?.orderNum || mpOrderId || '—';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-[540px] w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Pedido #{displayOrderNum}</p>
          <h1 className="text-[26px] md:text-[32px] font-bold leading-tight mb-4">¡Gracias por tu compra!</h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed mb-2">
            Te enviamos un email con la confirmación y los detalles del pedido. Preparamos tu orden y te avisamos cuando esté en camino.
          </p>
          <p className="text-[13px] text-muted-foreground mb-10">
            Ante cualquier duda escribinos por{' '}
            <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">@hypestylearg</a>
          </p>
          <div className="border-t border-border pt-8 mb-8 text-left space-y-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Información del pedido</p>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Número de pedido</span><span className="font-semibold">#{displayOrderNum}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Fecha</span><span>{fecha}</span></div>
            {order?.email && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Email</span><span className="truncate ml-4 text-right">{order.email}</span></div>}
            {mpStatus && mpStatus !== 'approved' && <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Estado MP</span><span className="capitalize">{mpStatus}</span></div>}
            <div className="flex justify-between text-[13px]"><span className="text-muted-foreground">Envío</span><span>Andreani — 5 a 10 días hábiles</span></div>
          </div>
          <a href="/" className="inline-flex items-center gap-2 bg-bg-dark text-primary-foreground px-10 py-4 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors">
            Seguir comprando
          </a>
        </div>
      </div>
    </div>
  );
}
