'use client';

import { ThreeDPhotoCarousel, type CarouselImage } from '@/components/ui/3d-carousel';
import './private-access.css';

interface Props {
  active: boolean;
  collectionName: string;
  images: CarouselImage[];
}

/**
 * "Private Preview": vitrina 3D de la colección debajo del banner del home,
 * directo sobre el blanco (sin card ni fondo), apaisada y con una sola línea
 * de texto. Quien todavía no desbloqueó ve que hay algo nuevo; el CTA sigue
 * siendo el ACCEDER del banner, por eso tocar una foto no abre nada.
 */
export default function PrivatePreviewCarousel({ active, collectionName, images }: Props) {
  if (!active || images.length < 3) return null;

  return (
    <section aria-label="Private Preview" className="bg-white">
      {/* Continuación de la card de arriba, sin label: el contexto lo da el banner. */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 md:pt-8 pb-4 md:pb-8">
        <ThreeDPhotoCarousel images={images} enablePreview={false} tone="light" heightMobile={240} heightDesktop={300} />
      </div>
    </section>
  );
}
