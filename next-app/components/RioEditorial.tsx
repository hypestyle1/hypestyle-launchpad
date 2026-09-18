'use client';

import Image from 'next/image';
import { useDragScroll } from '@/hooks/useDragScroll';
import { useReveal } from '@/hooks/useReveal';
import CarouselArrows from '@/components/CarouselArrows';

/**
 * Editorial de la produ en Rio de Janeiro (Fili, mayo 2026): una tira horizontal
 * de fotos, como la hoja de contacto de un rollo. La foto es la protagonista, no
 * hay tarjeta ni copy encima; abajo de cada una va el número de cuadro y el lugar.
 *
 * Las fotos verticales y horizontales conviven en la misma tira a la misma
 * altura: las horizontales ocupan el doble de ancho y cortan el ritmo. De la
 * produ solo 29 de 927 son horizontales, así que la tira es mayormente vertical
 * y en mobile se ve una foto entera por pantalla.
 */
type Foto = {
  src: string;
  /** vertical (4:5 en la tira) u horizontal (16:10) */
  o: 'v' | 'h';
  lugar: string;
  /** Solo en desktop: en mobile las horizontales se saltean para no achicar la foto. */
  soloDesktop?: boolean;
};

const FOTOS: Foto[] = [
  { src: '/rio/v-6606.webp', o: 'v', lugar: 'Ipanema — Dois Irmãos' },
  { src: '/rio/h-6210.webp', o: 'h', lugar: 'Ipanema', soloDesktop: true },
  { src: '/rio/v-6198.webp', o: 'v', lugar: 'Ipanema' },
  { src: '/rio/v-6323.webp', o: 'v', lugar: 'Rio de Janeiro' },
  { src: '/rio/h-6428.webp', o: 'h', lugar: 'Rio de Janeiro', soloDesktop: true },
  { src: '/rio/v-6442.webp', o: 'v', lugar: 'Rio de Janeiro' },
  { src: '/rio/v-6529.webp', o: 'v', lugar: 'Rio de Janeiro' },
  { src: '/rio/h-6519.webp', o: 'h', lugar: 'Ipanema — Dois Irmãos', soloDesktop: true },
  { src: '/rio/v-6852.webp', o: 'v', lugar: 'Ipanema — atardecer' },
  { src: '/rio/v-6785.webp', o: 'v', lugar: 'Rio de Janeiro' },
  { src: '/rio/h-6697.webp', o: 'h', lugar: 'Rio de Janeiro', soloDesktop: true },
  { src: '/rio/v-6908.webp', o: 'v', lugar: 'Rio de Janeiro' },
  { src: '/rio/v-6977.webp', o: 'v', lugar: 'Rio de Janeiro' },
];

export default function RioEditorial() {
  const ref = useReveal();
  const tira = useDragScroll();

  return (
    <section className="reveal bg-white py-14 md:py-20" ref={ref}>
      <div className="px-4 md:px-8 mb-6 md:mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Style &amp; Culture</p>
          <h2 className="text-[26px] md:text-[34px] font-semibold tracking-[-0.02em] leading-none">Rio de Janeiro</h2>
        </div>
        <p className="hidden md:block text-[12px] text-muted-foreground max-w-[300px] text-right leading-snug">
          La colección puesta en Rio de Janeiro. Fotos de Fili, mayo 2026.
        </p>
      </div>

      <div className="relative">
        {/* Tira: scroll nativo con snap; en desktop se arrastra con el mouse y hay flechas.
            La altura fija hace que verticales y horizontales convivan alineadas.
            scroll-pl: sin esto el snap alinea la primera foto al borde y se come el margen. */}
        <div
          ref={tira}
          className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 scroll-pl-4 md:scroll-pl-8 [counter-reset:foto] cursor-grab active:cursor-grabbing"
        >
          {FOTOS.map((f, i) => (
            <figure
              key={f.src}
              className={`relative shrink-0 snap-start [counter-increment:foto] h-[112vw] max-h-[560px] md:h-[68vh] md:max-h-[720px] ${
                f.o === 'h'
                  ? 'aspect-[16/10]'
                  : 'aspect-[4/5]'
              } ${f.soloDesktop ? 'hidden md:block' : ''}`}
            >
              <Image
                src={f.src}
                alt={`Hype en Rio de Janeiro — ${f.lugar}`}
                fill
                sizes={f.o === 'h' ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 90vw, 36vw'}
                loading={i < 2 ? 'eager' : 'lazy'}
                draggable={false}
                className="object-cover select-none"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 flex justify-between px-3 pb-3 text-[10px] uppercase tracking-[0.16em] text-white/85">
                <span>{f.lugar}</span>
                {/* Contador CSS: las horizontales ocultas en mobile no suman, así la numeración no salta. */}
                <span className="tabular-nums before:content-[counter(foto,decimal-leading-zero)]" />
              </figcaption>
            </figure>
          ))}
        </div>
        <CarouselArrows containerRef={tira} label="fotos de Rio" />
      </div>
    </section>
  );
}
