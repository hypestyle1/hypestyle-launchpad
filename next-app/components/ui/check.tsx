'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type CheckProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  children: React.ReactNode;
  className?: string;
};

/**
 * Checkbox con label (estilo coss.com). Por dentro es un checkbox nativo
 * oculto: el teclado, el lector de pantalla y el `checked` controlado
 * funcionan igual. El label es `select-none`, así el doble clic no deja el
 * texto pintado de gris.
 */
export function Check({ children, className, checked, disabled, ...props }: CheckProps) {
  const reduce = useReducedMotion();
  return (
    <label
      className={cn(
        'group inline-flex cursor-pointer select-none items-center gap-2.5',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input type="checkbox" checked={checked} disabled={disabled} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[5px] border transition-colors duration-150',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-foreground/25 peer-focus-visible:ring-offset-1',
          checked
            ? 'border-foreground bg-foreground text-white'
            : 'border-foreground/25 bg-white group-hover:border-foreground/50',
        )}
      >
        <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]" fill="none">
          <motion.path
            d="M2.5 6.2 4.9 8.5 9.5 3.5"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          />
        </svg>
      </span>
      <span className="text-[12px] text-muted-foreground transition-colors group-hover:text-foreground/80">{children}</span>
    </label>
  );
}
