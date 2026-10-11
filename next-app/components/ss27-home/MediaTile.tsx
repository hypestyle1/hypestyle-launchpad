'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { EDITORIAL_QUALITY, videoSources, type Ss27Media } from '@/lib/ss27-home';

/**
 * Foto o video editorial que va intercalado entre los productos.
 *
 * Los videos son mudos, en loop y se reproducen solo mientras están en
 * pantalla (IntersectionObserver): con 6-8 clips en el home, dejarlos todos
 * corriendo mata la batería en mobile. preload="none": no se baja nada del
 * video hasta que el bloque se acerca al viewport.
 *
 * El poster tampoco: un <video> con poster lo baja apenas está en el HTML, por
 * lejos que esté. Se asigna cuando el bloque está a 600 px de la pantalla
 * (antes los 7 posters se bajaban al cargar). `priority` (el hero) lo trae
 * desde el HTML.
 */
export function MediaFill({ media, sizes, priority }: { media: Ss27Media; sizes: string; priority?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(!!priority);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const cerca = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setNear(true); cerca.disconnect(); } },
      { rootMargin: '600px 0px' },
    );
    cerca.observe(v);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => cerca.disconnect();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: '100px 0px' },
    );
    io.observe(v);
    return () => { cerca.disconnect(); io.disconnect(); };
  }, []);

  if (media.kind === 'video') {
    return (
      <video
        ref={ref}
        poster={near ? media.poster : undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label={media.alt}
        className="absolute inset-0 h-full w-full object-cover"
      >
        {videoSources(media.src).map((s) => <source key={s.src} src={s.src} type={s.type} />)}
      </video>
    );
  }
  return <Image src={media.src} alt={media.alt} fill sizes={sizes} priority={priority} quality={EDITORIAL_QUALITY} className="object-cover" />;
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
