'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Billete con check (Hugeicons "payment-success-01"). El check se dibuja al
 * aparecer: es lo único animado de la tarjeta, chico y una sola vez.
 */
function PaymentSuccessIcon({ size = 22 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75">
      <path d="M2.017 14C4.217 14 6 15.783 6 17.983M6 4.017C6 6.217 4.217 8 2.017 8M18 4.017C18 6.197 19.769 7.97 21.942 8" />
      <path d="M22 11v-1c0-2.828 0-4.243-.879-5.121C20.243 4 18.828 4 16 4H8c-2.828 0-4.243 0-5.121.879C2 5.757 2 7.172 2 10v2c0 2.828 0 4.243.879 5.121C3.757 18 5.172 18 8 18h3" />
      <path d="M15 11a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />
      <motion.path
        d="M14 18s1 0 2 2c0 0 3.177-5 6-6"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
      />
    </svg>
  );
}

const MARCAS = [
  { src: '/pagos/visa.svg', alt: 'Visa' },
  { src: '/pagos/mastercard.svg', alt: 'Mastercard' },
  { src: '/pagos/americanexpress.svg', alt: 'American Express' },
  { src: '/pagos/mercadopago.svg', alt: 'Mercado Pago' },
  { src: '/pagos/paypal.svg', alt: 'PayPal' },
];

/**
 * Tarjeta de "pago seguro". Todo lo que dice es cierto para este checkout: el
 * cobro pasa siempre en la pasarela (Mercado Pago, GOcuotas, PayPal o la
 * transferencia), el sitio nunca recibe ni guarda los datos de la tarjeta.
 */
export function PagoSeguroCard({ en, className }: { en?: boolean; className?: string }) {
  const marcas = en ? MARCAS.filter(m => m.alt === 'PayPal' || m.alt === 'Visa' || m.alt === 'Mastercard') : MARCAS;
  return (
    <div className={cn('rounded-[10px] border border-border bg-foreground/[0.02] p-4', className)}>
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-bg-dark text-white">
          <PaymentSuccessIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]">
            {en ? 'Secure payment' : 'Pago 100% seguro'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {en
              ? 'You pay through PayPal or bank wire. Your details travel encrypted and we never see or store your card.'
              : 'Pagás en la plataforma que elijas. Tus datos viajan encriptados y nunca vemos ni guardamos tu tarjeta.'}
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-4 border-t border-border pt-3.5">
        {marcas.map(m => (
          <img key={m.alt} src={m.src} alt={m.alt} className="h-[22px] w-auto opacity-60" loading="lazy" />
        ))}
      </div>
    </div>
  );
}
