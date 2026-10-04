import { Lock, CreditCard, Globe, Truck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sello de la esquina del header. */
export function PagoSeguroBadge({ en, className }: { en?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/70',
        className,
      )}
    >
      <Lock aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      {en ? 'Secure checkout' : 'Pago seguro'}
    </span>
  );
}

/** Línea chica debajo del botón de pago. Es cierto: el cobro pasa siempre en
 *  la pasarela, el sitio nunca ve ni guarda los datos de la tarjeta. */
export function NotaPagoSeguro({ en }: { en?: boolean }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
      <Lock aria-hidden="true" className="h-3 w-3 flex-shrink-0" strokeWidth={2.25} />
      {en
        ? 'Encrypted payment. We never see or store your card details.'
        : 'Pago encriptado. Nunca vemos ni guardamos los datos de tu tarjeta.'}
    </p>
  );
}

/** Franja de garantías al pie del formulario. */
export function FranjaConfianza({ en, className }: { en?: boolean; className?: string }) {
  const items = en
    ? [
        { icon: Globe, title: 'Charged in USD', sub: 'PayPal or bank wire' },
        { icon: Truck, title: 'Worldwide shipping', sub: 'Tracked and insured' },
        { icon: RefreshCw, title: 'Easy exchanges', sub: 'We help you get the right size' },
      ]
    : [
        { icon: CreditCard, title: 'Cuotas sin interés', sub: 'Hasta 3 con tarjeta, 4 con débito' },
        { icon: Truck, title: 'Envío con Andreani', sub: 'Con seguimiento online' },
        { icon: RefreshCw, title: 'Cambios de talle', sub: 'Por Andreani o moto en CABA' },
      ];
  return (
    <ul className={cn('grid grid-cols-3 gap-3 border-t border-border pt-6', className)}>
      {items.map(({ icon: Icon, title, sub }) => (
        <li key={title} className="flex flex-col items-center gap-1.5 text-center">
          <Icon aria-hidden="true" className="h-[18px] w-[18px] text-foreground/70" strokeWidth={1.75} />
          <span className="text-[11px] font-semibold leading-tight">{title}</span>
          <span className="text-[10px] leading-tight text-muted-foreground">{sub}</span>
        </li>
      ))}
    </ul>
  );
}
