"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { DynamicButton } from "@/components/ui/dynamic-button";

/**
 * El botón del sitio. Dos cosas lo hacen "dinámico":
 *  - se hunde al apretar (`active:scale-[0.97]`) con una transición corta;
 *  - cuando el label es un string y cambia ("Enviar" → "Enviando…",
 *    "Agregar al carrito" → "Agregado"), el texto nuevo entra desde abajo y el
 *    ancho se acomoda con animación en vez de saltar (ver DynamicButton).
 * Con `asChild` (links) o con hijos que no son texto plano queda el botón
 * normal, con la misma piel.
 *
 * Variantes `hype*` = los CTAs del sitio público (negro, 12px, mayúsculas,
 * tracking 0.1em). El radio sale del token: 0 en el sitio, 10px en el admin.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[transform,color,background-color,border-color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /** CTA principal del sitio: negro, mayúsculas. */
        hype: "bg-bg-dark text-primary-foreground hover:bg-bg-dark/85 text-[12px] font-bold uppercase tracking-[0.1em]",
        /** CTA secundario: borde, se rellena al pasar. */
        hypeOutline: "border border-foreground text-foreground hover:bg-foreground hover:text-white text-[12px] font-bold uppercase tracking-[0.1em]",
        /** CTA sobre fondo oscuro: blanco. */
        hypeInverse: "bg-white text-bg-dark hover:bg-white/90 text-[12px] font-bold uppercase tracking-[0.1em]",
        /** CTA con la receta glass oscura (gift cards). */
        hypeGlass: "hs-glass-dark text-white text-[12px] font-bold uppercase tracking-[0.1em]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        /** CTA estándar del sitio. */
        cta: "px-8 py-3.5",
        /** CTA grande (confirmación, hero). */
        ctaLg: "px-10 py-4",
        /** CTA a todo el ancho (formularios, drawer). */
        ctaFull: "w-full py-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return <Slot className={classes} ref={ref} {...props}>{children}</Slot>;
    }

    // Label de texto plano: botón dinámico (ancho animado + entrada del texto).
    if (typeof children === "string") {
      const full = size === "ctaFull" || /\bw-full\b/.test(className ?? "");
      return (
        <DynamicButton ref={ref} className={classes} width={full ? "full" : "content"} {...props}>
          {children}
        </DynamicButton>
      );
    }

    return <button className={classes} ref={ref} {...props}>{children}</button>;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
