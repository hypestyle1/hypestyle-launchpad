'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { imgSrc } from '@/lib/img';

const CVU          = '0000003100024686621335';
const ALIAS        = 'hypestyle2';
const TITULAR      = 'Pozzi Valentín';
const BANCO        = 'MERCADO PAGO';


export default function PendientePago() {
  const router = useRouter();
  const { formatPrice } = useLocale();
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('hype_order');
    if (!raw) { router.push('/'); return; }
    const parsed = JSON.parse(raw);
    setOrder(parsed);
    setFecha(new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }));

    fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNum:      parsed.wcOrderNumber || parsed.orderNum,
        wcOrderId:     parsed.wcOrderId,
        orderKey:      parsed.orderKey,
        items:         parsed.items,
        total:         parsed.total,
        email:         parsed.email,
        nombre:        parsed.nombre,
        apellido:      parsed.apellido,
        ciudad:        parsed.ciudad,
        provincia:     parsed.provincia,
        paymentMethod: parsed.metodo,
        pais:          parsed.pais,
      }),
    }).catch(() => {});
  }, [router]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  if (!order) return null;

  const isIntl = order.pais && order.pais !== 'AR';
  const displayTotal    = order.total;
  const displayOrderNum = order.wcOrderNumber || order.orderNum;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>
      <div className="bg-[#1a1a1a] text-white text-center px-6 py-10">
        <p className="text-[15px] md:text-[17px] font-light leading-relaxed max-w-[620px] mx-auto">
          {isIntl
            ? 'Thank you for your order. We\'ll confirm your shipment and send all details by email within 24 hours.'
            : 'Gracias por ser parte. Estamos preparando tu pedido con el respeto que merece la cultura.'}
        </p>
        <img src="/STYLE&CULTURE WHITE.png" alt="Style & Culture" className="h-3 w-auto mx-auto mt-6 opacity-40" />
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        <div className="space-y-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
              {isIntl ? 'Order' : 'Pedido'}
            </p>
            <p className="text-[22px] font-bold">#{displayOrderNum}</p>
          </div>

          <div className="border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">
                  {isIntl ? 'Awaiting payment' : 'En espera de pago'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isIntl
                    ? 'Transfer the exact amount to the details below'
                    : 'Realizá la transferencia para confirmar tu pedido'}
                </p>
              </div>
            </div>

            <div className="px-5 py-5 space-y-5">
              {isIntl ? (
                <>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Send the exact amount via SEPA or international wire transfer to our Wise account. Use your order number <strong>#{displayOrderNum}</strong> as the reference.
                  </p>

                  <div className="bg-[#f8f8f6] border border-border p-4 space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">USD — ACH / Wire Transfer</p>
                    <div className="h-px bg-border" />
                    <BankRow label="Account holder" value="Valentin Pozzi" />
                    <div className="h-px bg-border" />
                    <BankRow label="Bank name" value="Lead Bank" />
                    <div className="h-px bg-border" />
                    <BankRow label="Routing number" value="101019644" onCopy={() => handleCopy('101019644', 'routing')} copied={copied === 'routing'} mono />
                    <div className="h-px bg-border" />
                    <BankRow label="Account number" value="210731653173" onCopy={() => handleCopy('210731653173', 'account')} copied={copied === 'account'} mono />
                    <div className="h-px bg-border" />
                    <BankRow label="Account type" value="Checking" />
                    <div className="h-px bg-border" />
                    <BankRow label="Currency" value="USD" />
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Amount</p>
                      <p className="text-[15px] font-bold">{formatPrice(displayTotal)}</p>
                    </div>
                    <div className="h-px bg-border" />
                    <BankRow label="Reference" value={`Order #${displayOrderNum}`} />
                  </div>

                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Once we confirm the transfer your order will be approved and we'll contact you to coordinate DHL shipping. Questions? DM us at{' '}
                    <a href="https://instagram.com/hypestylearg" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">@hypestylearg</a>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Transferí el monto exacto a los datos bancarios de abajo.
                  </p>
                  <div className="bg-[#f8f8f6] border border-border p-4 space-y-3">
                    <BankRow label="Banco" value={BANCO} />
                    <div className="h-px bg-border" />
                    <BankRow label="Titular" value={TITULAR} />
                    <div className="h-px bg-border" />
                    <BankRow label="Alias" value={ALIAS} />
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">CVU</p>
                        <p className="text-[13px] font-mono font-semibold tracking-wider">{CVU}</p>
                      </div>
                      <button onClick={() => handleCopy(CVU, 'cvu')}
                        className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-all flex-shrink-0 ${copied === 'cvu' ? 'border-green-600 text-green-600 bg-green-50' : 'border-foreground text-foreground hover:bg-foreground hover:text-white'}`}>
                        {copied === 'cvu' ? '✓ Copiado' : 'Copiar CVU'}
                      </button>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Monto a transferir</p>
                      <p className="text-[15px] font-bold">{formatPrice(displayTotal)}</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Una vez acreditado el pago tu orden se aprueba automáticamente. Si en 48hs no se acredita, la orden se cancela.
                  </p>
                </>
              )}

              <button onClick={() => router.push('/checkout/')}
                className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
                {isIntl ? 'Change payment method' : 'Cambiar medio de pago'}
              </button>
            </div>
          </div>

          <a href="/" className="inline-block border border-foreground text-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-foreground hover:text-white transition-colors">
            {isIntl ? 'Continue shopping' : 'Seguir comprando'}
          </a>
        </div>

        <div className="lg:border-l lg:border-border lg:pl-10">
          <div className="sticky top-6 space-y-6">
            <div className="space-y-4">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="relative w-16 h-20 bg-[#f0f0ec] flex-shrink-0 overflow-hidden">
                    <img src={imgSrc(item.image)} alt={item.name} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>
                  </div>
                  <span className="text-[13px] font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-[16px] font-bold">
                <span>Total</span>
                <span>{formatPrice(displayTotal)}</span>
              </div>
              {isIntl && (
                <p className="text-[11px] text-muted-foreground mt-1">* DHL shipping quoted separately</p>
              )}
            </div>
            <div className="space-y-2 text-[12px]">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                {isIntl ? 'Order details' : 'Información del pedido'}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{isIntl ? 'Order' : 'Pedido'}</span><span className="font-medium">#{displayOrderNum}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isIntl ? 'Date' : 'Fecha'}</span><span>{fecha}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate ml-4 text-right">{order.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isIntl ? 'Ship to' : 'Destino'}</span><span>{order.ciudad}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankRow({ label, value, onCopy, copied, mono }: {
  label: string; value: string; onCopy?: () => void; copied?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground flex-shrink-0">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        <p className={`text-[13px] font-semibold truncate ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</p>
        {onCopy && (
          <button onClick={onCopy}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all flex-shrink-0 rounded-[4px] ${copied ? 'border-green-600 text-green-600 bg-green-50' : 'border-foreground/30 text-foreground/60 hover:border-foreground hover:text-foreground'}`}>
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
