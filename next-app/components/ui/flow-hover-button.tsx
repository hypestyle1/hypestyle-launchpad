import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * FlowHoverButton — botón de la home (9/11, pedido de Valentín).
 *
 * Base: vidrio esmerilado BEIGE, el mismo de las cabeceras de colección
 * (`--glass-sticky-bg` / `--glass-sticky-filter` en globals.css, ver
 * .hs-collection-index), así el botón pertenece al sistema y no es un
 * agregado. Píldora, borde fino y sombra suave.
 *
 * Hover ("flow", adaptado de flow-hover-button de 21st.dev): un círculo negro
 * entra en diagonal desde abajo a la derecha y llena el botón; el texto pasa
 * a blanco. Sin `hover:scale` para que no salte la línea del título. Con
 * prefers-reduced-motion el relleno aparece sin recorrido.
 *
 * Con `href` es un <Link>; sin `href`, un <button>.
 */

const BASE =
  'group/flow relative z-0 inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full ' +
  'border border-black/[0.08] [background:var(--glass-sticky-bg)] [backdrop-filter:var(--glass-sticky-filter)] [-webkit-backdrop-filter:var(--glass-sticky-filter)] ' +
  'shadow-[0_6px_18px_-10px_rgba(10,10,10,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] ' +
  'font-medium text-foreground transition-[color,box-shadow,border-color] duration-500 ' +
  "before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5] before:rounded-[100%] before:bg-[#0a0a0a] before:content-[''] " +
  'before:transition-transform before:duration-700 before:ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  'hover:border-[#0a0a0a] hover:text-white hover:shadow-[0_10px_24px_-12px_rgba(10,10,10,0.55)] hover:before:translate-x-0 hover:before:translate-y-0 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 active:scale-[0.97] ' +
  'motion-reduce:before:transition-none';

const SIZES = {
  sm: 'h-9 px-4 text-[12px]',
  md: 'h-10 px-5 text-[12.5px]',
  lg: 'h-12 px-7 text-[13px]',
} as const;

type Props = {
  href?: string;
  size?: keyof typeof SIZES;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;

export function FlowHoverButton({ href, size = 'md', icon, className, children, ...props }: Props) {
  const cls = cn(BASE, SIZES[size], className);
  const contenido = (
    <>
      {icon}
      <span className="whitespace-nowrap">{children}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {contenido}
    </Link>
  ) : (
    <button type="button" className={cls} {...props}>
      {contenido}
    </button>
  );
}

export default FlowHoverButton;
