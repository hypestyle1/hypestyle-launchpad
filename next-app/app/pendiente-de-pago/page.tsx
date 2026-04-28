'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';

const CVU = '0000168300000005801714';
const TITULAR = 'Pozzi Valentín';
const BANCO = 'LEMON CASH';

export default function PendientePago() {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('hype_order');
    if (!raw) { router.push('/'); return; }
    setOrder(JSON.parse(raw));
    setFecha(new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, [router]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CVU).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  if (!order) return null;

  const displayTotal = order.total;
  const displayOrderNum = order.wcOrderNumber || order.orderNum;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>
      <div className="bg-[#1a1a1a] text-white text-center px-6 py-10">
        <p className="text-[12px] uppercase tracking-[0.2em] text-white/60 mb-3">STYLE&CULTURE</p>
        <p className="text-[15px] md:text-[17px] font-light leading-relaxed max-w-[620px] mx-auto">
          Gracias por ser parte. Estamos preparando tu pedido con el respeto que merece la cultura.
        </p>
        <p className="text-[13px] uppercase tracking-[0.3em] text-white/40 mt-5 font-semibold">STYLE&CULTURE.</p>
      </div>
      <div className="max-w-[1100px] mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        <div className="space-y-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Pedido</p>
            <p className="text-[22px] font-bold">#{displayOrderNum}</p>
          </div>
          <div className="border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">En espera de pago</p>
                <p className="text-[11px] text-muted-foreground">Realizá la transferencia para confirmar tu pedido</p>
              </div>
            </div>
            <div className="px-5 py-5 space-y-5">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Transferí el monto exacto a los datos bancarios de abajo.
              </p>
              <div className="bg-[#f8f8f6] border border-border p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Banco</p><p className="text-[13px] font-semibold">{BANCO}</p></div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Titular</p><p className="text-[13px] font-semibold">{TITULAR}</p></div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">CVU</p><p className="text-[13px] font-mono font-semibold tracking-wider">{CVU}</p></div>
                  <button onClick={handleCopy}
                    className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all flex-shrink-0 ${copied ? 'border-green-600 text-green-600 bg-green-50' : 'border-foreground text-foreground hover:bg-foreground hover:text-white'}`}>
                    {copied ? '✓ Copiado' : 'Copiar CVU'}
                  </button>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between"><p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Monto a transferir</p><p className="text-[15px] font-bold">{formatPrice(displayTotal)}</p></div>
              </div>
              <button onClick={() => router.push('/checkout/')} className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">Cambiar medio de pago</button>
            </div>
          </div>
          <a href="/" className="inline-block border border-foreground text-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-foreground hover:text-white transition-colors">Seguir comprando</a>
        </div>
        <div className="lg:border-l lg:border-border lg:pl-10">
          <div className="sticky top-6 space-y-6">
            <div className="space-y-4">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="relative w-16 h-20 bg-[#f0f0ec] flex-shrink-0 overflow-hidden">
                    <img src={item.image ? (item.image.startsWith('http') ? item.image : `/${item.image}`) : ''} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-[13px] font-medium leading-tight">{item.name}</p><p className="text-[11px] text-muted-foreground">Talle: {item.size}</p></div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4"><div className="flex justify-between text-[16px] font-bold"><span>Total</span><span>{formatPrice(displayTotal)}</span></div></div>
            <div className="space-y-2 text-[12px]">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">Información del pedido</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span className="font-medium">#{displayOrderNum}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span>{fecha}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate ml-4 text-right">{order.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Destino</span><span>{order.ciudad}, {order.provincia}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
