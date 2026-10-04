'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Campos del checkout con label flotante. Vacío, el label ocupa el lugar del
 * placeholder; al escribir sube y queda chico arriba, así un campo lleno sigue
 * diciendo qué es ("40123456" solo no dice que es el DNI).
 *
 * El atributo `placeholder` se conserva con el mismo texto del label (y se
 * pinta transparente): el label se posiciona con `peer-placeholder-shown`, y
 * los tests e2e ubican los campos por placeholder.
 */
const base =
  'peer w-full h-[52px] rounded-[10px] border border-border bg-white px-4 pt-[18px] pb-[5px] text-[13px] text-foreground ' +
  'placeholder:text-transparent focus:outline-none focus:border-foreground transition-colors ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const floatingLabel =
  'pointer-events-none absolute left-4 top-[9px] text-[10px] leading-none text-muted-foreground transition-all duration-150 ' +
  'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] ' +
  'peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-foreground/70';

type FloatingInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wrapperClassName?: string;
};

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, id, className, wrapperClassName, placeholder, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <div className={cn('relative', wrapperClassName)}>
        <input
          ref={ref}
          id={inputId}
          placeholder={placeholder ?? label}
          className={cn(base, className)}
          {...props}
        />
        <label htmlFor={inputId} className={floatingLabel}>
          {label}
        </label>
      </div>
    );
  },
);
FloatingInput.displayName = 'FloatingInput';

type FloatingSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  wrapperClassName?: string;
};

/** Un select siempre tiene valor, así que su label vive siempre arriba. */
export const FloatingSelect = React.forwardRef<HTMLSelectElement, FloatingSelectProps>(
  ({ label, id, className, wrapperClassName, children, ...props }, ref) => {
    const autoId = React.useId();
    const selectId = id ?? autoId;
    return (
      <div className={cn('relative', wrapperClassName)}>
        <select
          ref={ref}
          id={selectId}
          className={cn(base, 'appearance-none pr-10 cursor-pointer', className)}
          {...props}
        >
          {children}
        </select>
        <label htmlFor={selectId} className="pointer-events-none absolute left-4 top-[9px] text-[10px] leading-none text-muted-foreground">
          {label}
        </label>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
      </div>
    );
  },
);
FloatingSelect.displayName = 'FloatingSelect';
