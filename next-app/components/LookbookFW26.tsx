'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDragScroll } from '@/hooks/useDragScroll';
import { useReveal } from '@/hooks/useReveal';
import CarouselArrows from '@/components/CarouselArrows';

/**
 * Lookbook FW26: la produ en Rio de Janeiro (fotos de Fili, mayo 2026) como una
 * tira horizontal, y debajo de cada foto el producto que lleva puesto con el
 * acceso directo a la ficha. La foto es la protagonista: nada de tarjeta ni
 * copy encima, solo un número de cuadro chico.
 *
 * Desktop y mobile usan fotos distintas: en desktop van las horizontales
 * (16:10, a doble ancho) y en mobile los recortes 4:5 de las verticales, así
 * en el teléfono se ve una foto entera por pantalla sin achicar nada.
 *
 * Las fotos ya vienen con el color hecho (Redes & Pauta/PRODU RIO - FILI/
 * EDITADAS, grade.cjs): acá no se toca nada.
 */
type Look = {
  src: string;
  /** vertical (recorte 4:5) u horizontal (16:10) */
  o: 'v' | 'h';
  /** Qué lleva puesto. Sin `href` cuando la pieza todavía no está en el catálogo. */
  producto: string;
  href?: string;
};

// Solo las piezas que ya existen en Woo llevan link. El top gris con cuello,
// el buzo negro crop y la remera blanca de la produ no están cargados aún.
const CAMO = { producto: 'Camo Full Set', href: '/producto/camo-full-set-combo/' };
const PINK = { producto: 'Zip Hoodie Pink', href: '/producto/zip-hoodie-pink/' };
const JERSEY = { producto: 'La Nuestra — Jersey Mundial 26', href: '/producto/la-nuestra-jersey-mundial-26/' };
const MESH = { producto: 'Mesh Camo Blue Tee', href: '/producto/mesh-camo-blue-tee/' };
const GREY = { producto: 'Grey HStars Set' };
const BLACK = { producto: 'Black Crop Hoodie' };
const WHITE = { producto: 'White Tee' };
const HOODIE_PINK = { producto: 'Hoodie Pink', href: '/producto/hoodie-pink/' };

const DESKTOP: Look[] = [
  { src: '/lookbook-fw26/h-6209.webp', o: 'h', ...CAMO },
  { src: '/lookbook-fw26/h-6317.webp', o: 'h', ...GREY },
  { src: '/lookbook-fw26/h-6428.webp', o: 'h', ...BLACK },
  { src: '/lookbook-fw26/h-6519.webp', o: 'h', ...PINK },
  { src: '/lookbook-fw26/h-6533.webp', o: 'h', ...PINK },
  { src: '/lookbook-fw26/h-6697.webp', o: 'h', ...PINK },
  { src: '/lookbook-fw26/h-6947.webp', o: 'h', ...JERSEY },
  { src: '/lookbook-fw26/h-6210.webp', o: 'h', ...CAMO },
];

const MOBILE: Look[] = [
  { src: '/lookbook-fw26/v-6606.webp', o: 'v', ...PINK },
  { src: '/lookbook-fw26/v-6198.webp', o: 'v', ...CAMO },
  { src: '/lookbook-fw26/v-6323.webp', o: 'v', ...GREY },
  { src: '/lookbook-fw26/v-6442.webp', o: 'v', ...BLACK },
  { src: '/lookbook-fw26/v-6529.webp', o: 'v', ...PINK },
  { src: '/lookbook-fw26/v-6718.webp', o: 'v', ...MESH },
  { src: '/lookbook-fw26/v-6852.webp', o: 'v', ...HOODIE_PINK },
  { src: '/lookbook-fw26/v-6785.webp', o: 'v', ...WHITE },
  { src: '/lookbook-fw26/v-6908.webp', o: 'v', ...JERSEY },
  { src: '/lookbook-fw26/v-6977.webp', o: 'v', ...JERSEY },
];

function Tira({ looks, className }: { looks: Look[]; className: string }) {
  const tira = useDragScroll();
  return (
    <div className={`relative ${className}`}>
      {/* Scroll nativo con snap; en desktop se arrastra con el mouse y hay flechas.
          scroll-pl: sin esto el snap alinea la primera foto al borde y se come el margen. */}
      <div
        ref={tira}
        className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 scroll-pl-4 md:scroll-pl-8 cursor-grab active:cursor-grabbing"
      >
        {looks.map((l, i) => {
          const foto = (
            <div
              className={`relative overflow-hidden bg-neutral-100 ${
                l.o === 'h' ? 'aspect-[16/10] w-[58vw] max-w-[820px]' : 'aspect-[4/5] w-[84vw] max-w-[440px]'
              }`}
            >
              <Image
                src={l.src}
                alt={`Lookbook FW26 — ${l.producto} en Rio de Janeiro`}
                fill
                sizes={l.o === 'h' ? '58vw' : '84vw'}
                loading={i < 2 ? 'eager' : 'lazy'}
                draggable={false}
                className="object-cover select-none"
              />
              <span className="absolute top-3 right-3 text-[10px] tracking-[0.16em] text-white/80 tabular-nums drop-shadow">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          );
          return (
            <figure key={l.src} className="shrink-0 snap-start">
              {l.href ? <Link href={l.href} draggable={false}>{foto}</Link> : foto}
              {/* Debajo de la foto: qué es y el acceso directo. Sin link queda solo el nombre. */}
              <figcaption className="mt-3 flex items-baseline justify-between gap-4">
                <span className="text-[13px] md:text-[14px] font-medium leading-tight">{l.producto}</span>
                {l.href ? (
                  <Link
                    href={l.href}
                    className="shrink-0 text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-foreground/60 transition-colors"
                  >
                    Ver producto
                  </Link>
                ) : (
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Próximamente</span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <CarouselArrows containerRef={tira} label="looks" />
    </div>
  );
}

export default function LookbookFW26() {
  const ref = useReveal();

  return (
    <section className="reveal bg-white py-14 md:py-20" ref={ref}>
      <div className="px-4 md:px-8 mb-6 md:mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Style&amp;Culture</p>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.01em] leading-none">Lookbook FW26</h2>
        </div>
        <p className="hidden md:block text-[12px] text-muted-foreground max-w-[300px] text-right leading-snug">
          La colección puesta, en Rio de Janeiro.
        </p>
      </div>

      {/* Dos tiras, una por pantalla: las fotos son distintas, no un recorte de las mismas. */}
      <Tira looks={DESKTOP} className="hidden md:block" />
      <Tira looks={MOBILE} className="md:hidden" />
    </section>
  );
}
