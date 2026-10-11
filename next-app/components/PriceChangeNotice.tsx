'use client';

import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Aviso de que el precio de algo del carrito cambió desde que se agregó (ver
 * lib/cart-reprice.ts). Va en el drawer y en el resumen del checkout: el monto
 * que se ve ya es el que se cobra, pero el cliente tiene que saber por qué no
 * coincide con lo que vio antes.
 */
export default function PriceChangeNotice({ en = false, className = '' }: { en?: boolean; className?: string }) {
  const { priceChanges, dismissPriceChanges } = useCart();
  const { formatPrice } = useLocale();
  if (priceChanges.length === 0) return null;

  return (
    <div role="status" className={`border border-border bg-foreground/[0.03] px-4 py-3 text-[12px] leading-snug ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          {en ? 'We updated the price of your cart' : 'Actualizamos el precio de tu carrito'}
        </p>
        <button
          type="button"
          onClick={dismissPriceChanges}
          className="text-foreground/50 underline underline-offset-2 hover:text-foreground"
        >
          {en ? 'OK' : 'Entendido'}
        </button>
      </div>
      <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
        {priceChanges.map((c) => (
          <li key={`${c.id}-${c.size}`}>
            {c.name} ({c.size}):{' '}
            <span className="line-through whitespace-nowrap">{formatPrice(c.antes)}</span>{' '}
            <span className="text-foreground font-medium whitespace-nowrap">{formatPrice(c.ahora)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
