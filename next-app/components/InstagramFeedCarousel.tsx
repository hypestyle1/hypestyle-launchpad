'use client';

import type { InstagramPost } from '@/lib/instagram';
import { useDragScroll } from '@/hooks/useDragScroll';

/**
 * Carrusel horizontal del feed de Instagram. Mismo patrón que Shop the Look
 * (scroll nativo + snap + drag con el mouse), sin librerías nuevas.
 *
 * Va último en la página, así que las imágenes cargan diferido y sin prioridad:
 * no compiten con el LCP del home. Se usa <img> y no next/image a propósito —
 * las URLs del CDN de Instagram son firmadas y rotan, meterlas al optimizador
 * de Next obligaría a un remotePattern comodín y a cachear imágenes que caducan.
 */
export default function InstagramFeedCarousel({ posts }: { posts: InstagramPost[] }) {
  // El hook ya cancela el click que sigue a un arrastre (si no, soltar el
  // carrusel abriría el post que quedó abajo del cursor).
  const dragRef = useDragScroll();

  return (
    <div
      ref={dragRef}
      className="flex gap-[2px] overflow-x-auto no-scrollbar snap-x snap-mandatory cursor-grab select-none"
    >
      {posts.map((post) => (
        <a
          key={post.id}
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className="group relative flex-none w-[48vw] sm:w-[33vw] md:w-[25vw] lg:w-[16.6vw] aspect-square snap-start bg-bg-alt overflow-hidden"
        >
          <img
            src={post.imageUrl}
            alt={post.caption ? post.caption.slice(0, 120) : 'Publicación de Hypestyle en Instagram'}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
          {post.isVideo && (
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white drop-shadow"
            />
          )}
          <span className="sr-only">Ver publicación en Instagram</span>
        </a>
      ))}
    </div>
  );
}
