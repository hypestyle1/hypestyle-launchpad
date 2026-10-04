'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarCheck, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MetodoPago = { id: string; label: string; sub: string; badge?: string };

/** Marcas monocromas (simple-icons, CC0) en /public/pagos: en negro, como el resto del sitio. */
function Marca({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="h-[18px] w-auto opacity-80" loading="lazy" />;
}

function Logos({ id }: { id: string }) {
  switch (id) {
    case 'tarjeta':
      return (
        <span className="flex items-center gap-2">
          <Marca src="/pagos/visa.svg" alt="Visa" />
          <Marca src="/pagos/mastercard.svg" alt="Mastercard" />
          <Marca src="/pagos/americanexpress.svg" alt="American Express" />
        </span>
      );
    case 'mercadopago':
      return <Marca src="/pagos/mercadopago.svg" alt="Mercado Pago" />;
    case 'paypal':
      return <Marca src="/pagos/paypal.svg" alt="PayPal" />;
    case 'gocuotas':
      return <CalendarCheck aria-hidden="true" className="h-[18px] w-[18px] text-foreground/70" strokeWidth={1.75} />;
    case 'transferencia':
      return <Landmark aria-hidden="true" className="h-[18px] w-[18px] text-foreground/70" strokeWidth={1.75} />;
    default:
      return null;
  }
}

type Props = {
  metodos: MetodoPago[];
  value: string;
  onChange: (id: string) => void;
  /** El sub de la transferencia local va en verde: es el que dice cuánto se ahorra. */
  destacarSub?: (id: string) => boolean;
};

/**
 * Lista de medios de pago. Sigue siendo un grupo de radios nativos (teclado,
 * lector de pantalla y el `name` del form funcionan igual que antes); lo visual
 * es un radio propio con el punto que entra animado, y las opciones aparecen
 * escalonadas al llegar al paso.
 */
export function MedioDePago({ metodos, value, onChange, destacarSub }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="space-y-2"
      initial={reduce ? false : 'oculto'}
      animate="visible"
      variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.05 } } }}
    >
      {metodos.map((m) => {
        const sel = value === m.id;
        return (
          <motion.label
            key={m.id}
            variants={{ oculto: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'relative flex cursor-pointer items-center gap-3.5 rounded-[10px] border px-4 py-3.5 transition-colors',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/20 has-[:focus-visible]:ring-offset-1',
              sel ? 'border-foreground bg-foreground/[0.03]' : 'border-border hover:border-foreground/40',
            )}
          >
            <input
              type="radio"
              name="metodo"
              value={m.id}
              checked={sel}
              onChange={() => onChange(m.id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
                sel ? 'border-foreground' : 'border-foreground/30',
              )}
            >
              <AnimatePresence initial={false}>
                {sel && (
                  <motion.span
                    key="dot"
                    className="block h-2 w-2 rounded-full bg-foreground"
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={reduce ? undefined : { scale: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  />
                )}
              </AnimatePresence>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-medium">{m.label}</span>
                {m.badge && (
                  <span className="rounded-full bg-green-50 px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.06em] text-green-700">
                    {m.badge}
                  </span>
                )}
              </span>
              {m.sub && (
                <span className={cn('mt-0.5 block text-[11px]', destacarSub?.(m.id) ? 'font-semibold text-green-700' : 'text-muted-foreground')}>
                  {m.sub}
                </span>
              )}
            </span>

            <span className="flex-shrink-0">
              <Logos id={m.id} />
            </span>
          </motion.label>
        );
      })}
    </motion.div>
  );
}
