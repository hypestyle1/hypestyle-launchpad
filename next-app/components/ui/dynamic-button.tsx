'use client';

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type DynamicButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** El label. Cuando cambia, el botón se redimensiona con animación y el
   *  texto nuevo entra desde abajo. */
  children: string;
  icon?: ReactNode;
  /** Ancho por contenido (animado) o 100% del contenedor. */
  width?: 'content' | 'full';
};

/**
 * Botón cuyo label cambia de estado sin saltar: "Aplicar" → "Aplicado",
 * "Realizar pedido" → "Procesando…". Mide el label nuevo en un span oculto y
 * transiciona el `width` hasta ahí, así el botón no cambia de ancho de golpe y
 * el layout de alrededor no se mueve.
 *
 * Sólo se anima la entrada del texto (no la salida): con CSS puro la salida
 * pediría mantener el label viejo montado, y el ancho animado ya hace el
 * grueso del efecto.
 */
export const DynamicButton = forwardRef<HTMLButtonElement, DynamicButtonProps>(
  function DynamicButton({ children, className, icon, width = 'content', type = 'button', style, ...props }, ref) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [ancho, setAncho] = useState<number | null>(null);
    const mide = width === 'content';

    useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    const sync = useCallback(() => {
      const button = buttonRef.current;
      const measure = measureRef.current;
      if (!button || !measure || !mide) return;
      const s = window.getComputedStyle(button);
      const extra =
        parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) +
        parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
      const next = Math.ceil(measure.scrollWidth + extra);
      setAncho((cur) => (cur === next ? cur : next));
    }, [mide]);

    useLayoutEffect(() => {
      const measure = measureRef.current;
      if (!measure || !mide) { setAncho(null); return; }
      sync();
      const observer = new ResizeObserver(sync);
      observer.observe(measure);
      window.addEventListener('resize', sync);
      return () => { observer.disconnect(); window.removeEventListener('resize', sync); };
    }, [mide, sync, children, icon]);

    return (
      <button
        {...props}
        ref={buttonRef}
        type={type}
        style={{ ...style, width: mide && ancho !== null ? ancho : undefined }}
        className={cn(
          'relative inline-flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap',
          'transition-[width,color,background-color,border-color,transform] duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
          'active:scale-[0.97] motion-reduce:transition-none',
          width === 'full' && 'w-full',
          className,
        )}
      >
        <span className="relative inline-flex items-center gap-1.5">
          {icon ? (
            <span key={`icon-${children}`} className="hs-label-in inline-flex size-[15px] shrink-0 items-center justify-center">
              {icon}
            </span>
          ) : null}
          <span key={children} className="hs-label-in block">
            {children}
          </span>
        </span>
        {/* Copia invisible para medir el ancho del label nuevo. */}
        <span
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute inline-flex items-center gap-1.5 opacity-0"
        >
          {icon ? <span className="flex size-[15px] shrink-0 items-center justify-center">{icon}</span> : null}
          <span>{children}</span>
        </span>
      </button>
    );
  },
);
