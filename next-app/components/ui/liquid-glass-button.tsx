'use client';

import * as React from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Botón "liquid glass": bordes con brillo interno y el fondo de atrás
 * distorsionado con un filtro SVG (feTurbulence + feDisplacementMap).
 *
 * Adaptado del componente original de shadcn: solo LiquidButton (el Button y
 * el MetalButton del original usan clases de Tailwind v4 y acá estamos en v3),
 * y en vez de asChild (el Slot de Radix exige un único hijo y este botón lleva
 * varias capas adentro) recibe `href` y se renderiza como Link.
 * Safari no soporta backdrop-filter con url(): ahí queda el backdrop-blur de la
 * clase como respaldo.
 * Hover: escala, brillo alrededor, el vidrio se aclara y cruza un reflejo. En
 * celulares (sin hover) el reflejo pasa solo cada pocos segundos
 * (.liquid-sheen-idle en globals.css).
 * `onDark`: brillos blancos en el borde, para usarlo sobre foto o video.
 */
const liquidbuttonVariants = cva(
  'group relative isolate inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-full text-sm font-medium transition duration-300 ease-out hover:scale-105 active:scale-[0.97] hover:shadow-[0_0_28px_rgba(255,255,255,0.28)] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-white/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 text-xs gap-1.5 px-4',
        lg: 'h-10 px-6',
        xl: 'h-12 px-8',
        xxl: 'h-14 px-10',
      },
    },
    defaultVariants: { size: 'xxl' },
  },
);

const SHADOW_LIGHT =
  'shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]';
const SHADOW_DARK =
  'shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]';

type LiquidButtonProps = VariantProps<typeof liquidbuttonVariants> & {
  className?: string;
  children: React.ReactNode;
  onDark?: boolean;
  href?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

function LiquidButton({ className, size, onDark, href, children, ...props }: LiquidButtonProps) {
  const filterId = `liquid-glass-${React.useId().replace(/:/g, '')}`;
  const layers = (
    <>
      <span className={cn('absolute inset-0 z-0 rounded-full transition-all', onDark ? SHADOW_DARK : SHADOW_LIGHT)} />
      <span
        className="absolute inset-0 isolate -z-10 overflow-hidden rounded-full backdrop-blur-sm"
        style={{ backdropFilter: `url("#${filterId}")`, WebkitBackdropFilter: `url("#${filterId}")` }}
      />
      {/* Hover: el vidrio se aclara un poco y cruza un reflejo de lado a lado. */}
      <span className="pointer-events-none absolute inset-0 z-[1] rounded-full bg-white/0 transition-colors duration-300 group-hover:bg-white/[0.12]" />
      <span className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-full">
        <span className="liquid-sheen-idle absolute inset-y-0 -left-1/2 w-1/2 -translate-x-[120%] -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[320%]" />
      </span>
      <span className="pointer-events-none relative z-10">{children}</span>
      <GlassFilter id={filterId} />
    </>
  );
  const cls = cn(liquidbuttonVariants({ size }), className);

  if (href) {
    return (
      <Link href={href} data-slot="button" className={cls}>
        {layers}
      </Link>
    );
  }
  return (
    <button data-slot="button" className={cls} {...props}>
      {layers}
    </button>
  );
}

function GlassFilter({ id }: { id: string }) {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {/* Ruido turbulento para la distorsión, suavizado */}
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves={1} seed={1} result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          {/* Desplaza lo de atrás con ese ruido y lo desenfoca */}
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

export { LiquidButton, liquidbuttonVariants };
