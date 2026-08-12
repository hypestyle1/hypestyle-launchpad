'use client';

import type { InstagramPost } from '@/lib/instagram';
import { useDragScroll } from '@/hooks/useDragScroll';
import CarouselArrows from './CarouselArrows';

const IG_PROFILE_URL = 'https://instagram.com/hypestylearg';

/**
 * Sección del feed de Instagram: encabezado + carrusel horizontal. Mismo patrón
 * que Shop the Look (scroll nativo + snap + drag con el mouse), sin librerías.
 *
 * El encabezado vive acá y no en el Server Component que hace el fetch porque
 * las flechas necesitan el ref del contenedor, y un ref no cruza la frontera
 * servidor/cliente. El token sigue sin salir del servidor: lo único que baja
 * al cliente son los posts ya resueltos.
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
    <section className="w-full pt-10 md:pt-14 pb-10 md:pb-14" aria-labelledby="instagram-feed-title">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between gap-4 mb-6">
        <h2 id="instagram-feed-title" className="text-xl md:text-2xl font-bold uppercase tracking-tight">
          Seguinos en Instagram
        </h2>
        <div className="flex items-center gap-5">
          <a
            href={IG_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground pb-0.5"
          >
            @hypestylearg
          </a>
          <CarouselArrows containerRef={dragRef} label="publicaciones" />
        </div>
      </div>

      {/* A sangre completa, como el resto de los bloques editoriales del pie. */}
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
    </section>
  );
}
