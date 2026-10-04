'use client';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls, type MotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

// Carrusel 3D (cilindro de fotos). Adaptado del snippet de 21st.dev al stack
// del repo: `motion/react` (ya era dependencia, es el framer-motion
// renombrado), next/image para que cada cara pida una versión chica y
// optimizada en vez de la foto original, y sin tokens de color ajenos (los
// `bg-mauve-*` del original no existen en nuestro Tailwind).
//
// Interacción: flechas a los lados que lo mueven de a varias caras con un
// easing largo (la principal), y drag con mouse o swipe que al soltar asienta
// en la cara más cercana. `drag="x"` deja `touch-action: pan-y`, así el scroll
// vertical del sitio sigue funcionando sobre el carrusel. Sin autoplay.

export interface CarouselImage {
  src: string;
  alt: string;
}

export interface ThreeDPhotoCarouselProps {
  images: CarouselImage[];
  /** Tocar una foto la abre ampliada. Apagado por defecto: en el home el CTA es ACCEDER. */
  enablePreview?: boolean;
  /** Alto del escenario. Default 280 en mobile, 360 en desktop. */
  heightMobile?: number;
  heightDesktop?: number;
  /** Sobre fondo oscuro (default) o claro: cambia borde, sombra y velo de las caras. */
  tone?: 'dark' | 'light';
  /** Flechas a los lados. Default true. */
  showArrows?: boolean;
  /** Cuántas caras avanza cada click. Default 3. */
  step?: number;
  className?: string;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);
  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);
  return matches;
}

// Píxeles de arrastre → grados. A menor valor, más "pesado" se siente el cilindro.
const DRAG_FACTOR = 0.12;
const INERTIA_FACTOR = 0.08;
// Easing del paso con flechas: arranca decidido y frena largo, sin rebote.
const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const STEP_DURATION = 1.1;

function normDeg(d: number): number {
  const m = ((d % 360) + 360) % 360;
  return m > 180 ? m - 360 : m;
}

/**
 * Una cara del cilindro. Su "presencia" depende de qué tan cerca del frente
 * está: al frente opacidad y escala completas; hacia los lados se aleja un
 * poco, se apaga y se oscurece. Todo derivado del motion value de rotación,
 * sin re-render por frame.
 */
const Face = memo(function Face({
  img, index, count, radius, faceWidth, faceHeight, rotation, tone, onSelect, sizes,
}: {
  img: CarouselImage; index: number; count: number; radius: number;
  faceWidth: number; faceHeight: number; rotation: MotionValue<number>;
  tone: 'dark' | 'light'; onSelect?: () => void; sizes: string;
}) {
  const angle = index * (360 / count);
  // 0 al frente, 1 a 90° (de canto).
  const t = useTransform(rotation, (v) => Math.min(1, Math.abs(normDeg(angle + v)) / 90));
  const opacity = useTransform(t, [0, 1], [1, 0.5]);
  const scale = useTransform(t, [0, 1], [1, 0.9]);
  const filter = useTransform(t, (x) => `brightness(${1 - 0.18 * x})`);

  return (
    <div
      className="absolute top-1/2 flex items-center justify-center"
      style={{
        width: faceWidth,
        height: faceHeight,
        marginTop: -faceHeight / 2,
        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
        backfaceVisibility: 'hidden',
      }}
      onClick={onSelect}
    >
      <motion.div
        style={{ opacity, scale, filter }}
        className={cn(
          'relative h-full w-full overflow-hidden rounded-[14px] border',
          tone === 'dark'
            ? 'border-white/10 bg-neutral-900 shadow-[0_18px_40px_rgba(0,0,0,0.45)]'
            : 'border-black/[0.06] bg-bg-alt shadow-[0_10px_28px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)]',
          onSelect && 'cursor-pointer',
        )}
      >
        <Image src={img.src} alt={img.alt} fill sizes={sizes} quality={85} draggable={false} className="pointer-events-none object-cover" />
        {tone === 'dark' && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/5" />
        )}
      </motion.div>
    </div>
  );
});

function ArrowButton({ dir, onClick, label }: { dir: 'left' | 'right'; onClick: () => void; label: string }) {
  const Icon = dir === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full',
        'bg-black/60 text-white border border-white/20 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
        'transition-colors duration-200 hover:bg-[hsl(142,71%,32%)] hover:border-[hsl(142,71%,45%)]/60 active:scale-95',
        dir === 'left' ? 'left-1 md:left-3' : 'right-1 md:right-3',
      )}
    >
      <Icon size={20} strokeWidth={1.8} />
    </button>
  );
}

export function ThreeDPhotoCarousel({
  images,
  enablePreview = false,
  heightMobile = 280,
  heightDesktop = 360,
  tone = 'dark',
  showArrows = true,
  step = 3,
  className,
}: ThreeDPhotoCarouselProps) {
  const isSm = useMediaQuery('(max-width: 640px)');
  const [active, setActive] = useState<CarouselImage | null>(null);
  const rotation = useMotionValue(0);
  const transform = useTransform(rotation, (v) => `rotate3d(0, 1, 0, ${v}deg)`);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const dragged = useRef(false);

  const height = isSm ? heightMobile : heightDesktop;
  // Caras en 3:4 (foto de campaña vertical), maquetadas a su tamaño FINAL: la
  // del frente ocupa el 87% del alto tal cual, sin que la perspectiva la
  // agrande. Antes se maquetaban chicas y la perspectiva las estiraba ×1.45:
  // el navegador rasteriza la foto al tamaño maquetado y después la escala,
  // así que se veía borrosa (sobre todo en pantallas retina).
  const faceHeight = Math.round(height * 0.87);
  const faceWidth = Math.round(faceHeight * 0.75);

  // Un cilindro con pocas caras muestra 3 fotos y mucho vacío. La lista se
  // repite hasta llegar a ~20 caras (8 fotos → 24): el radio crece, el frente
  // se vuelve panorámico y cada foto aparece varias veces en la vuelta. No se
  // pide ninguna foto de más: next/image dedupea la URL.
  const faces = useMemo(() => {
    const list = images.filter((i) => i?.src);
    if (list.length === 0) return list;
    const reps = Math.max(1, Math.ceil(20 / list.length));
    return Array.from({ length: reps }, () => list).flat();
  }, [images]);

  const count = faces.length;
  // Perímetro = caras × ancho (con un poco de aire entre caras).
  const cylinderWidth = faceWidth * count * 1.15;
  const radius = cylinderWidth / (2 * Math.PI);
  // El cilindro se corre hacia atrás un radio (translateZ(-radius)), así la
  // cara del frente queda justo en el plano de la pantalla, a escala 1, y las
  // laterales se achican con la distancia: se achican (nítidas) en vez de
  // agrandarse la del frente (borrosa). Perspectiva atada al radio para que la
  // profundidad sea la misma con cualquier cantidad de fotos.
  const perspective = radius * 2.6;
  const degPerFace = count ? 360 / count : 0;
  // La cara del frente se ve a su ancho real: el navegador multiplica por la
  // densidad de pantalla y en retina pide la foto al doble.
  const sizes = `${faceWidth}px`;

  // Un click mueve `step` caras y deja una cara exactamente al frente, así los
  // clicks seguidos no acumulan desfase. Derecha = el tren viene de la derecha.
  const stepBy = (dir: 1 | -1) => {
    anim.current?.stop();
    const current = rotation.get();
    const target = Math.round(current / degPerFace) * degPerFace - dir * step * degPerFace;
    anim.current = animate(rotation, target, { duration: STEP_DURATION, ease: STEP_EASE });
  };

  if (count < 3) return null;

  // Drag en todos los tamaños (mouse en desktop, swipe en mobile); las flechas conviven.
  const draggable = !active;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative w-full overflow-hidden" style={{ height }}>
        {/* pointer-events-none en los dos contenedores: con el cilindro corrido
            hacia atrás, las caras laterales quedan detrás del plano de estos
            divs y sin esto ellos se quedaban con el click y el drag. */}
        <div className="pointer-events-none flex h-full w-full items-center justify-center" style={{ perspective: `${perspective}px`, transformStyle: 'preserve-3d' }}>
          <div className="pointer-events-none flex h-full justify-center" style={{ transform: `translateZ(${-radius}px)`, transformStyle: 'preserve-3d' }}>
          <motion.div
            drag={draggable ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            dragMomentum={false}
            className={cn('pointer-events-auto relative flex h-full origin-center justify-center select-none', draggable && 'cursor-grab active:cursor-grabbing')}
            // Sin will-change: con eso el navegador congela la rasterización
            // a la escala inicial y no vuelve a dibujar nítido al girar.
            style={{ transform, width: cylinderWidth, transformStyle: 'preserve-3d' }}
            onDragStart={() => { anim.current?.stop(); dragged.current = false; }}
            onDrag={(_, info) => {
              if (Math.abs(info.offset.x) > 6) dragged.current = true;
              rotation.set(rotation.get() + info.delta.x * DRAG_FACTOR);
            }}
            onDragEnd={(_, info) => {
              // Inercia acotada a ±1 vuelta de pantalla y después asienta en la
              // cara más cercana al frente, con el mismo easing que las flechas.
              const throwDeg = Math.max(-90, Math.min(90, info.velocity.x * INERTIA_FACTOR));
              const current = rotation.get();
              const target = Math.round((current + throwDeg) / degPerFace) * degPerFace;
              const duration = Math.min(STEP_DURATION, 0.45 + Math.abs(target - current) / 120);
              anim.current = animate(rotation, target, { duration, ease: STEP_EASE });
            }}
          >
            {faces.map((img, i) => (
              <Face
                key={`${img.src}-${i}`}
                img={img}
                index={i}
                count={count}
                radius={radius}
                faceWidth={faceWidth}
                faceHeight={faceHeight}
                rotation={rotation}
                tone={tone}
                sizes={sizes}
                onSelect={enablePreview ? () => { if (!dragged.current) setActive(img); } : undefined}
              />
            ))}
          </motion.div>
          </div>
        </div>

        {showArrows && (
          <>
            <ArrowButton dir="left" label="Anterior" onClick={() => stepBy(-1)} />
            <ArrowButton dir="right" label="Siguiente" onClick={() => stepBy(1)} />
          </>
        )}
      </div>

      {enablePreview && (
        <AnimatePresence>
          {active && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={active.alt}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setActive(null)}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-12 cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="relative h-full w-full max-w-[720px] max-h-[88dvh] overflow-hidden rounded-[18px] border border-white/10"
              >
                <Image src={active.src} alt={active.alt} fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
