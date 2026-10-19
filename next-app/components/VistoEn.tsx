'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/context/LocaleContext";
import SectionHeader from "./SectionHeader";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useReveal } from "@/hooks/useReveal";
import { useProducts, type NormalizedProduct } from "@/hooks/useProducts";
import { VISTO_EN, vistoEnFoto, type VistoEnPost } from "@/data/vistoEn";

/**
 * Visto en — tira de fotos de artistas con Hype puesto (referencia: el feed
 * "shop the post" de Scuffers). Al tocar una foto se abre un modal con la foto
 * grande y las prendas que lleva, con precio y link a la ficha.
 *
 * Los productos salen de la query ['products'] (precargada en el home), así
 * que precio y stock están siempre al día. Un post sin ninguna prenda en el
 * catálogo se muestra igual (las fotos viejas suman) y el modal lo aclara.
 */

interface Prenda {
  slug: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  /** Sin href: prenda que nunca estuvo en Woo (merch de colabs), va como agotada. */
  href?: string;
  agotado: boolean;
}

function prendas(post: VistoEnPost, bySlug: Map<string, NormalizedProduct>): Prenda[] {
  const fuera: Prenda[] = (post.fueraDeCatalogo ?? []).map((x) => ({
    slug: x.imagen,
    name: x.nombre,
    image: x.imagen,
    price: 0,
    agotado: true,
  }));
  return post.slugs.flatMap((slug): Prenda[] => {
    const p = bySlug.get(slug);
    if (!p) return [];
    return [{
      slug: p.slug,
      name: p.name,
      image: p.image,
      price: p.price,
      originalPrice: p.originalPrice,
      href: p.href,
      agotado: Object.values(p.stock).every((s) => s === 'out'),
    }];
  }).concat(fuera);
}

interface VistoEnProps {
  /** Encabezado de la sección. */
  titulo?: string;
  /**
   * 'tira' es el home: la foto lleva el nombre del artista y su @.
   * 'look' es la ficha de producto: fotos más grandes y un botón
   * "Shop the look" encima, estilo coldcultureworldwide.com.
   */
  variante?: 'tira' | 'look';
  /** Pone adelante los posts donde alguien lleva puesta esta prenda. */
  slugDestacado?: string;
}

export default function VistoEn({ titulo = 'Visto en', variante = 'tira', slugDestacado }: VistoEnProps = {}) {
  const { data: allProducts = [] } = useProducts(0);
  const [abierto, setAbierto] = useState<number | null>(null);

  const posts = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    const todos = VISTO_EN.map((post) => ({ post, prendas: prendas(post, bySlug) }));
    if (!slugDestacado) return todos;
    // En la ficha, primero las fotos de alguien usando justo esa prenda; el
    // resto queda atrás, que para eso es inspiración.
    const lleva = ({ post }: { post: VistoEnPost }) => post.slugs.includes(slugDestacado);
    return [...todos.filter(lleva), ...todos.filter((p) => !lleva(p))];
  }, [allProducts, slugDestacado]);

  // Se espera al catálogo para no mostrar un instante los posts sin prendas.
  // Sin estas deps los hooks correrían con el ref vacío y no se engancharían
  // nunca (ver useDragScroll).
  const montada = allProducts.length > 0;
  const dragRef = useDragScroll([montada]);
  const revealRef = useReveal([montada]);

  if (!montada) return null;
  const sel = abierto !== null ? posts[abierto] : null;

  return (
    <section className="py-10 md:py-14" ref={revealRef}>
      {/* Misma línea que el Shop the look: encabezado pegado a los bordes y
          tira a todo el ancho (arranca alineada al título y se va por el borde). */}
      <div className="reveal rd1 px-4 md:px-6">
        <SectionHeader title={titulo} />
      </div>

      <div ref={dragRef} className="reveal rd2 flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar cursor-grab select-none px-4 md:px-6 scroll-px-4 md:scroll-px-6">
        {posts.map(({ post }, i) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setAbierto(i)}
            aria-label={`${post.artista}: ver lo que lleva`}
            className={`group relative flex-none ${
              variante === 'look'
                ? 'w-[76vw] sm:w-[46vw] md:w-[32vw] lg:w-[27vw]'
                : 'w-[62vw] sm:w-[38vw] md:w-[23vw] lg:w-[21vw]'
            } aspect-[4/5] overflow-hidden rounded-[6px] bg-bg-alt text-left`}
          >
            {post.video ? (
              <VideoEnVista
                src={post.video}
                poster={vistoEnFoto(post)}
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(.25,1,.5,1)] md:group-hover:scale-[1.04] motion-reduce:transition-none"
              />
            ) : (
              <img
                src={vistoEnFoto(post)}
                alt={post.alt}
                width={1080}
                height={1350}
                loading={i < 3 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(.25,1,.5,1)] md:group-hover:scale-[1.04] motion-reduce:transition-none"
              />
            )}
            {variante === 'look' && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="border border-white/90 text-white text-[12px] tracking-[0.04em] px-4 py-2 bg-black/15 backdrop-blur-[2px] transition-colors duration-200 md:group-hover:bg-white md:group-hover:text-black">
                  Shop the look
                </span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" aria-hidden />
            <span className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2 text-white">
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] leading-tight">{post.artista}</span>
                <span className="block text-[11px] lowercase opacity-80 mt-0.5 truncate">{post.ig.map((u) => `@${u}`).join(' · ')}</span>
              </span>
              {variante === 'tira' && (
                <span className="text-[11px] opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap">Ver lo que lleva</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {sel && (
        <PostModal
          kicker={titulo}
          post={sel.post}
          prendas={sel.prendas}
          onClose={() => setAbierto(null)}
          onPrev={() => setAbierto((a) => (a === null ? a : (a - 1 + posts.length) % posts.length))}
          onNext={() => setAbierto((a) => (a === null ? a : (a + 1) % posts.length))}
        />
      )}
    </section>
  );
}

interface ModalProps {
  /** Línea chica arriba del nombre: "Visto en" en el home, "Shop the look" en la ficha. */
  kicker: string;
  post: VistoEnPost;
  prendas: Prenda[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function PostModal({ kicker, post, prendas, onClose, onPrev, onNext }: ModalProps) {
  const { formatPrice } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, onNext, onPrev]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/45 backdrop-blur-[6px] animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${post.artista}: lo que lleva`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[880px] max-h-[88vh] rounded-[10px] grid grid-rows-[auto_minmax(0,1fr)] md:grid-rows-none md:grid-cols-[300px_minmax(0,1fr)] overflow-hidden bg-background/90 backdrop-blur-[20px] animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        {/* Foto: arriba en mobile, a la derecha en desktop. */}
        <div className="md:order-2 relative bg-black min-h-0">
          {post.video ? (
            <VideoEnVista
              key={post.id}
              src={post.video}
              poster={vistoEnFoto(post)}
              className="w-full h-full max-h-[46vh] md:max-h-[88vh] object-cover md:aspect-[4/5]"
            />
          ) : (
            <img
              key={post.id}
              src={vistoEnFoto(post)}
              alt={post.alt}
              width={1080}
              height={1350}
              decoding="async"
              className="w-full h-full max-h-[46vh] md:max-h-[88vh] object-cover md:aspect-[4/5]"
            />
          )}
          {/* Cerrar: círculo con el mismo glass que las flechas, arriba a la derecha de la foto. */}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-2 right-2 md:top-3 md:right-3 w-9 h-9 grid place-items-center rounded-full bg-white/15 border border-white/30 text-white backdrop-blur-[12px] hover:bg-white/25 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
          <div className="absolute inset-x-0 bottom-0 flex justify-between p-2 md:p-3">
            <NavBtn dir="prev" onClick={onPrev} />
            <NavBtn dir="next" onClick={onNext} />
          </div>
        </div>

        <div className="md:order-1 flex flex-col gap-4 p-4 md:p-5 overflow-y-auto min-h-0">
          <div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">{kicker}</p>
              <h3 className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em] leading-tight mt-1">{post.artista}</h3>
              <p className="text-[12px] mt-1 flex flex-wrap gap-x-2">
                {post.ig.map((u) => (
                  <a
                    key={u}
                    href={`https://www.instagram.com/${u}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lowercase text-foreground/60 hover:text-foreground underline-offset-[3px] hover:underline"
                  >
                    @{u}
                  </a>
                ))}
              </p>
              {post.contexto && <p className="text-[12px] text-foreground/60 mt-1">{post.contexto}</p>}
            </div>
          </div>

          {prendas.length === 0 && (
            <p className="text-[12px] text-foreground/60 leading-snug">Lo que lleva en esta foto ya no está disponible.</p>
          )}
          {post.link && (
            <a href={post.link.href} className="self-start text-[12px] font-semibold underline underline-offset-4">{post.link.label}</a>
          )}
          <ul className="flex flex-col gap-1.5">
            {prendas.map((p) => {
              const contenido = (
                <>
                  <img
                    src={p.image}
                    alt=""
                    width={52}
                    height={52}
                    loading="lazy"
                    decoding="async"
                    className={`w-[52px] h-[52px] object-cover rounded-[4px] bg-bg-alt ${p.agotado ? 'opacity-45 grayscale' : ''}`}
                  />
                  <span className="min-w-0">
                    <span className={`block text-[12px] font-semibold uppercase leading-tight ${p.agotado ? 'text-text-light' : ''}`}>{p.name}</span>
                    {p.agotado ? (
                      <span className="block text-[12px] text-text-light mt-0.5">Agotado</span>
                    ) : (
                      <span suppressHydrationWarning className="block text-[12px] tabular-nums mt-0.5">
                        {formatPrice(p.price)}
                        {p.originalPrice && <span className="ml-1.5 text-text-light line-through">{formatPrice(p.originalPrice)}</span>}
                      </span>
                    )}
                  </span>
                  {p.href && <span className="text-[11px] underline underline-offset-[3px] decoration-foreground/40 group-hover:decoration-foreground">Ver</span>}
                </>
              );
              const cls = "group grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center p-2 rounded-[4px] bg-background";
              return (
                <li key={p.slug}>
                  {p.href ? (
                    <a href={p.href} className={`${cls} hover:bg-bg-alt transition-colors`}>{contenido}</a>
                  ) : (
                    <div className={cls}>{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Foto anterior' : 'Foto siguiente'}
      className="w-9 h-9 grid place-items-center rounded-[6px] bg-white/15 border border-white/30 text-white backdrop-blur-[12px] hover:bg-white/25 transition-colors"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5" aria-hidden>
        <path d={dir === 'prev' ? 'M10 2 4 8l6 6' : 'm6 2 6 6-6 6'} />
      </svg>
    </button>
  );
}

/**
 * Video corto sin sonido, en loop. Se descarga y reproduce solo mientras está
 * en pantalla (y nunca con "reducir movimiento": ahí queda el póster).
 */
function VideoEnVista({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      className={className}
    />
  );
}
