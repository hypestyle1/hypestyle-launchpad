import Image from 'next/image';
import { PRIVATE_BANNER_IMAGES } from '@/lib/private-access/banner-images';
import './private-access.css';

/**
 * Tira de fotos de la colección debajo de la cabecera de /private-access.
 * Avanza sola en loop (la lista va dos veces y la animación corre la mitad
 * del ancho, así el corte no se ve) y frena con el mouse encima. Con
 * "reducir movimiento" queda quieta y se recorre con scroll horizontal.
 */
export default function PrivatePhotoStrip() {
  const images = PRIVATE_BANNER_IMAGES;
  return (
    <section aria-label="Spring Summer 27 · fotos" className="pt-5 md:pt-6 overflow-hidden">
      <div className="pa-strip">
        <div className="pa-strip-track">
          {[...images, ...images].map((img, i) => (
            <div
              key={i}
              className="relative shrink-0 aspect-[4/5] h-[260px] md:h-[380px] overflow-hidden rounded-[14px] md:rounded-[18px] bg-bg-alt"
              aria-hidden={i >= images.length || undefined}
            >
              <Image
                src={img.src}
                alt={i >= images.length ? '' : img.alt}
                fill
                sizes="(min-width: 768px) 304px, 208px"
                className="object-cover"
                priority={i < 4}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
