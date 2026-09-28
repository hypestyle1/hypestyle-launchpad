'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { DynamicButton } from '@/components/ui/dynamic-button';
import { imgSrc } from '@/lib/img';
import type { RepagoMethod, RepagoView, StockProblem } from '@/lib/repago';

const WA_NUMBER = '5491178292430';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const wa = (text: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

const METHODS: Record<RepagoMethod, { title: string; detail: string }> = {
  transferencia: { title: 'Transferencia bancaria', detail: 'Transferís desde tu banco o billetera y nos mandás el comprobante.' },
  tarjeta:       { title: 'Tarjeta de crédito o débito', detail: 'Pagás con Mercado Pago, hasta 3 cuotas.' },
  mercadopago:   { title: 'Mercado Pago', detail: 'Pagás con el dinero de tu cuenta.' },
};

const ERRORS: Record<string, string> = {
  paid: 'Este pedido ya está pagado.',
  'in-process': 'Ya hay un pago acreditándose para este pedido.',
  expired: 'El plazo para pagar este pedido ya pasó.',
  closed: 'Este pedido ya no se puede pagar desde acá.',
  stock: 'Una de las prendas se agotó mientras tanto.',
  gateway: 'Mercado Pago no respondió. Probá de nuevo en un momento.',
  'not-found': 'Abrí de nuevo el link que te mandamos.',
};

function stockText(p: StockProblem): string {
  const label = p.size && p.size.toLowerCase() !== 'única' ? `${p.name} (talle ${p.size})` : p.name;
  if (p.reason === 'unknown') return `${label}: no pudimos confirmar el stock.`;
  if (p.reason === 'insufficient') return `${label}: quedan menos unidades de las que pediste.`;
  return `${label} se agotó.`;
}

export default function PagarClient({ view, vuelta }: { view: RepagoView | null; vuelta: 'rechazado' | 'pendiente' | null }) {
  const [method, setMethod] = useState<RepagoMethod | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<{ total: number } | null>(
    view?.transferChosen ? { total: view.totals.transferencia } : null,
  );
  const [copied, setCopied] = useState(false);

  if (!view) {
    return (
      <Shell>
        <Message
          title="No encontramos este pedido"
          body="Abrí el link completo que te mandamos. Si sigue sin abrir, escribinos y lo resolvemos."
          cta={{ label: 'Escribir por WhatsApp', href: wa('Hola! Quiero terminar de pagar mi pedido y el link no me abre.') }}
        />
      </Shell>
    );
  }

  const numero = view.orderNumber;
  const soloUnknown = view.stock.length > 0 && view.stock.every(p => p.reason === 'unknown');

  const pagar = async () => {
    if (!method || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/pagar/${view.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // El pedido cambió desde que se cargó la página: se vuelve a leer de Woo.
        if (['paid', 'in-process', 'expired', 'closed', 'stock'].includes(data.error)) { window.location.reload(); return; }
        setError(ERRORS[data.error] || 'No pudimos iniciar el pago. Probá de nuevo.');
        setSending(false);
        return;
      }
      if (data.redirect) { window.location.href = data.redirect; return; }
      setTransfer({ total: data.total });
      setSending(false);
    } catch {
      setError('No pudimos iniciar el pago. Revisá tu conexión y probá de nuevo.');
      setSending(false);
    }
  };

  let main: React.ReactNode;
  if (view.state === 'paid') {
    main = <Message title="Este pedido ya está pagado" body={`El pedido #${numero} ya está confirmado, no hay nada más que pagar. Te avisamos por mail cuando salga.`} cta={{ label: 'Volver al home', href: '/' }} />;
  } else if (view.state === 'in-process') {
    main = <Message title="Estamos confirmando tu pago" body={`Ya hay un pago en curso para el pedido #${numero}. Apenas se acredite te llega la confirmación por mail.`} cta={{ label: 'Escribir por WhatsApp', href: wa(`Hola! Consulto por el pago de mi pedido #${numero}`) }} />;
  } else if (view.state === 'expired' || view.state === 'closed') {
    main = <Message title="Este pedido ya cerró" body={`El pedido #${numero} ya no se puede pagar desde este link. Las prendas siguen en la tienda, y si preferís lo armamos juntos por WhatsApp.`} cta={{ label: 'Ir a la tienda', href: '/productos' }} secondary={{ label: 'Escribir por WhatsApp', href: wa(`Hola! Quería retomar mi pedido #${numero}`) }} />;
  } else if (view.stock.length > 0) {
    main = (
      <div className="space-y-5">
        <h1 className="text-[24px] md:text-[28px] font-bold leading-tight">
          {soloUnknown ? 'No pudimos confirmar el stock' : 'Una prenda de tu pedido se agotó'}
        </h1>
        <ul className="space-y-1 text-[14px]">
          {view.stock.map((p, i) => <li key={i}>{stockText(p)}</li>)}
        </ul>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {soloUnknown
            ? 'Probá de nuevo en un momento. El pedido queda guardado.'
            : 'Por eso el pedido queda en pausa y no se cobra. Escribinos y vemos otro talle u otra prenda.'}
        </p>
        {soloUnknown ? (
          <DynamicButton onClick={() => window.location.reload()} className="bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] rounded-[8px] hover:bg-bg-dark/85">
            Probar de nuevo
          </DynamicButton>
        ) : (
          <WhatsAppButton href={wa(`Hola! Quiero terminar de pagar mi pedido #${numero} pero una prenda se agotó.`)} label="Resolverlo por WhatsApp" />
        )}
      </div>
    );
  } else if (transfer) {
    main = (
      <div className="space-y-5">
        <h1 className="text-[24px] md:text-[28px] font-bold leading-tight">Transferí y mandanos el comprobante</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Transferí el monto exacto a estos datos. Cuando nos llega el comprobante aprobamos el pedido y te mandamos la confirmación por mail.
        </p>
        <div className="bg-[#f8f8f6] border border-border p-4 space-y-3">
          <Row label="Cuenta" value={view.account.banco} />
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Alias</p>
              <p className="text-[13px] font-mono font-semibold tracking-wider break-all">{view.account.alias}</p>
            </div>
            <DynamicButton
              onClick={() => navigator.clipboard.writeText(view.account.alias).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })}
              icon={copied ? <Check className="h-[13px] w-[13px]" strokeWidth={3} /> : <Copy className="h-[13px] w-[13px]" />}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border rounded-[8px] flex-shrink-0 ${copied ? 'border-green-600 text-green-700 bg-green-50' : 'border-foreground text-foreground hover:bg-foreground hover:text-white'}`}
            >
              {copied ? 'Copiado' : 'Copiar alias'}
            </DynamicButton>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Monto a transferir</p>
            <p className="text-[15px] font-bold">{money(transfer.total)}</p>
          </div>
        </div>
        <WhatsAppButton href={wa(`Hola! Te paso el comprobante de la transferencia de mi pedido #${numero}`)} label="Enviar comprobante por WhatsApp" />
        {view.methods.length > 1 && (
          <button onClick={() => { setTransfer(null); setMethod(null); }} className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
            Todavía no transferí, quiero pagar de otra forma
          </button>
        )}
      </div>
    );
  } else {
    main = (
      <div className="space-y-6">
        <div>
          <h1 className="text-[24px] md:text-[28px] font-bold leading-tight">
            {view.nombre ? `${view.nombre}, tu pedido te está esperando` : 'Tu pedido te está esperando'}
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-2">
            Elegí cómo pagar y lo preparamos. Es el mismo pedido #{numero}, con las prendas y los talles que elegiste.
          </p>
        </div>

        {vuelta === 'rechazado' && <Notice>El pago anterior fue rechazado y no se te cobró nada. Podés probar de nuevo o elegir otro medio.</Notice>}
        {vuelta === 'pendiente' && <Notice>El pago anterior quedó pendiente en Mercado Pago. Si ya lo completaste, esperá unos minutos antes de volver a pagar.</Notice>}

        <div className="space-y-2" role="radiogroup" aria-label="Medio de pago">
          {view.methods.map(m => {
            const active = method === m;
            const conDescuento = m === 'transferencia' && view.transferDiscount > 0;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { setMethod(m); setError(null); }}
                className={`w-full text-left border rounded-[8px] px-4 py-3.5 flex items-center justify-between gap-4 transition-colors ${active ? 'border-foreground bg-[#f8f8f6]' : 'border-border hover:border-foreground/40'}`}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">
                    {METHODS[m].title}
                    {conDescuento && <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-green-700">10% off</span>}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">{METHODS[m].detail}</span>
                </span>
                <span className="text-[14px] font-bold flex-shrink-0">{money(view.totals[m])}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-[13px] text-red-700" role="alert">{error}</p>}

        <DynamicButton
          width="full"
          disabled={!method || sending}
          onClick={pagar}
          className="bg-bg-dark text-primary-foreground py-4 text-[12px] font-bold uppercase tracking-[0.1em] rounded-[8px] hover:bg-bg-dark/85 disabled:opacity-40"
        >
          {sending ? 'Procesando…' : method ? `Pagar ${money(view.totals[method])}` : 'Elegí un medio de pago'}
        </DynamicButton>

        <p className="text-[12px] text-muted-foreground">
          ¿Dudas? Escribinos por{' '}
          <a href={wa(`Hola! Consulto por mi pedido #${numero}`)} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">WhatsApp</a>.
        </p>
      </div>
    );
  }

  const totalMostrado = transfer ? transfer.total : method ? view.totals[method] : view.total;
  const ajuste = Math.round((totalMostrado - view.total) * 100) / 100;

  return (
    <Shell>
      <div className="max-w-[1100px] w-full mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Pedido #{numero}</p>
          {main}
        </div>

        <aside className="lg:border-l lg:border-border lg:pl-10">
          <div className="lg:sticky lg:top-6 space-y-6">
            <div className="space-y-4">
              {view.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="relative w-16 h-20 bg-[#f0f0ec] flex-shrink-0 overflow-hidden">
                    {item.image && (
                      <img src={imgSrc(item.image)} alt={item.name} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-foreground/60 text-white text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                    {item.size && <p className="text-[11px] text-muted-foreground">Talle: {item.size}</p>}
                  </div>
                  <span className="text-[13px] font-semibold">{item.gift ? 'Regalo' : money(item.total)}</span>
                </div>
              ))}
            </div>
            <dl className="border-t border-border pt-4 space-y-1.5 text-[13px]">
              {view.shipping && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{view.shipping.label}</dt>
                  <dd>{view.shipping.total > 0 ? money(view.shipping.total) : 'Gratis'}</dd>
                </div>
              )}
              {view.discounts.map((d, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd>{money(d.total)}</dd>
                </div>
              ))}
              {ajuste !== 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{ajuste < 0 ? 'Transferencia (10%)' : 'Sin descuento por transferencia'}</dt>
                  <dd>{ajuste < 0 ? money(ajuste) : `+${money(ajuste)}`}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-2 text-[16px] font-bold">
                <dt>Total</dt>
                <dd>{money(totalMostrado)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-border py-5 px-4 text-center">
        <a href="/"><img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto object-contain mx-auto" /></a>
      </div>
      {children}
    </div>
  );
}

function Message({ title, body, cta, secondary }: {
  title: string; body: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="max-w-[540px] mx-auto px-4 py-4 lg:px-0 lg:mx-0 space-y-5">
      <h1 className="text-[24px] md:text-[28px] font-bold leading-tight">{title}</h1>
      <p className="text-[14px] text-muted-foreground leading-relaxed">{body}</p>
      <div className="flex flex-col items-start gap-3">
        <a href={cta.href} className="inline-block bg-bg-dark text-primary-foreground px-8 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] rounded-[8px] hover:bg-bg-dark/85">
          {cta.label}
        </a>
        {secondary && (
          <a href={secondary.href} target="_blank" rel="noopener noreferrer" className="text-[12px] underline text-muted-foreground hover:text-foreground transition-colors">
            {secondary.label}
          </a>
        )}
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="border border-border bg-[#f8f8f6] px-4 py-3 text-[13px] leading-relaxed">{children}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground flex-shrink-0">{label}</p>
      <p className="text-[13px] font-semibold truncate">{value}</p>
    </div>
  );
}

function WhatsAppButton({ href, label }: { href: string; label: string }) {
  return (
    <DynamicButton
      width="full"
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
      icon={<MessageCircle className="h-[15px] w-[15px]" />}
      className="py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-white rounded-[8px] hover:opacity-90"
      style={{ background: '#25D366' }}
    >
      {label}
    </DynamicButton>
  );
}
