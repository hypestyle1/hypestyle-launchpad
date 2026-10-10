'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Ss27Media } from '@/lib/ss27-home';

/**
 * Foto o video editorial que va intercalado entre los productos.
 *
 * Los videos son mudos, en loop y se reproducen solo mientras están en
 * pantalla (IntersectionObserver): con 6-8 clips en el home, dejarlos todos
 * corriendo mata la batería en mobile. preload="none" + poster: no se baja
 * nada del video hasta que el bloque se acerca al viewport.
 */
export function MediaFill({ media, sizes, priority }: { media: Ss27Media; sizes: string; priority?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  if (media.kind === 'video') {
    return (
      <video
        ref={ref}
        src={media.src}
        poster={media.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={media.alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return <Image src={media.src} alt={media.alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

type Props = {
  media: Ss27Media;
  className?: string;
  sizes?: string;
  /** Texto encima: 'corner' abajo a la izquierda, 'none' sin texto. */
  caption?: 'corner' | 'none';
  priority?: boolean;
};

export default function MediaTile({ media, className = '', sizes = '(min-width: 1024px) 50vw, 100vw', caption = 'corner', priority }: Props) {
  const body = (
    <>
      <MediaFill media={media} sizes={sizes} priority={priority} />
      {caption === 'corner' && (media.title || media.kicker) && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute left-4 bottom-4 right-4 md:left-5 md:bottom-5 text-white">
            {media.kicker && <p className="text-[10px] uppercase tracking-[0.18em] text-white/75 mb-1">{media.kicker}</p>}
            {media.title && <p className="text-[17px] md:text-[20px] font-semibold leading-tight">{media.title}</p>}
          </div>
        </>
      )}
    </>
  );
  const cls = `relative block overflow-hidden rounded-[4px] bg-bg-alt ${className}`;
  return media.href ? (
    <Link href={media.href} className={`${cls} group`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
