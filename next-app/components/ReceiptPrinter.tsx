'use client';

import { Check, Loader2, X } from 'lucide-react';
import { type ReactNode, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

/** Las tres etapas mapean 1 a 1 con lo que resuelve `paymentStateFrom()` en
 *  /confirmacion: procesando (pending), imprimiendo/listo (approved) y
 *  rechazado. No hay estado visual que el backend no sepa producir. */
export type ReceiptStage = 'procesando' | 'imprimiendo' | 'listo' | 'rechazado';

type Ctx = { stage: ReceiptStage };
const ReceiptCtx = createContext<Ctx | null>(null);

function useReceipt(quien: string) {
  const ctx = useContext(ReceiptCtx);
  if (!ctx) throw new Error(`${quien} tiene que ir dentro de <ReceiptPrinter>.`);
  return ctx;
}

const LABEL: Record<ReceiptStage, string> = {
  procesando: 'Confirmando el pago',
  imprimiendo: 'Imprimiendo tu comprobante',
  listo: 'Compra confirmada',
  rechazado: 'El pago no se completó',
};

/**
 * Impresora térmica: una máquina negra con una pantalla de estado y un ticket
 * que sale por abajo.
 *
 * Todo el movimiento es CSS (ver `hs-receipt-feed` en globals.css). El avance
 * del papel va por pasos —sale un tramo, frena, sale otro— porque es eso lo que
 * lo hace leer como impresora y no como un div deslizándose.
 */
export function ReceiptPrinter({
  stage,
  children,
  className,
}: {
  stage: ReceiptStage;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ReceiptCtx.Provider value={{ stage }}>
      <section
        aria-label="Comprobante"
        data-stage={stage}
        className={cn('relative isolate flex w-full max-w-[420px] flex-col items-center', className)}
      >
        {children}
      </section>
    </ReceiptCtx.Provider>
  );
}

/** La carcasa. Negra, para que el ticket blanco salga con contraste real. */
function Machine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative isolate w-full overflow-hidden rounded-[14px] bg-bg-dark p-3 pb-7',
        'shadow-[0_20px_36px_-20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]',
        className,
      )}
    >
      {children}
      {/* La ranura por donde sale el papel. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-3 z-40 h-2 rounded-[3px] bg-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]"
      />
    </div>
  );
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative z-10 flex items-start justify-between gap-3 pb-3', className)}>
      {children}
    </div>
  );
}

/** El visor. */
function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative z-10 overflow-hidden rounded-[10px] bg-black p-4 text-white',
        'shadow-[inset_0_0_24px_4px_rgba(0,0,0,0.65)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Status({ children, className }: { children?: ReactNode; className?: string }) {
  const { stage } = useReceipt('ReceiptPrinter.Status');
  const listo = stage === 'listo';
  const fallo = stage === 'rechazado';

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
        {fallo ? (
          <X className="h-[18px] w-[18px] text-destructive" strokeWidth={2.5} />
        ) : listo ? (
          <Check className="h-[18px] w-[18px] text-success" strokeWidth={2.5} />
        ) : (
          <Loader2 className="h-[18px] w-[18px] animate-spin text-white/60 motion-reduce:animate-none" />
        )}
      </span>
      <div role="status" aria-live="polite" className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium leading-none text-white/70">
          {children ?? LABEL[stage]}
        </p>
      </div>
    </div>
  );
}

/** La zona por donde asoma el ticket. Recorta lo que todavía no salió. */
function Output({ children, className }: { children: ReactNode; className?: string }) {
  const { stage } = useReceipt('ReceiptPrinter.Output');
  const visible = stage !== 'procesando' && stage !== 'rechazado';

  if (!visible) return null;

  return (
    <div
      className={cn(
        'relative z-50 -mt-3 w-[calc(100%-2.5rem)] max-w-full overflow-hidden px-4',
        className,
      )}
    >
      {/* Sombra de la ranura sobre el papel: es lo que lo hace parecer que sale
          de adentro y no que está apoyado encima. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 -top-1 z-20 h-2 bg-black/70 blur-[6px]"
      />
      <div className={stage === 'imprimiendo' ? 'hs-receipt-feed' : undefined}>{children}</div>
    </div>
  );
}

/** El papel. */
function Paper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        'hs-receipt-paper relative z-10 bg-white px-5 pb-8 pt-6 font-mono text-[13px] text-black',
        'shadow-[0_8px_24px_rgba(0,0,0,0.18)]',
        className,
      )}
    >
      {children}
    </article>
  );
}

ReceiptPrinter.Machine = Machine;
ReceiptPrinter.Header = Header;
ReceiptPrinter.Screen = Screen;
ReceiptPrinter.Status = Status;
ReceiptPrinter.Output = Output;
ReceiptPrinter.Paper = Paper;
