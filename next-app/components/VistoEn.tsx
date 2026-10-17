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
 * catálogo se oculta.
 */

interface Prenda {
  slug: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  href: string;
  agotado: boolean;
}

function prendas(post: VistoEnPost, bySlug: Map<string, NormalizedProduct>): Prenda[] {
  return post.slugs.flatMap((slug) => {
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
  });
}

export default function VistoEn() {
  const { data: allProducts = [] } = useProducts(0);
  const [abierto, setAbierto] = useState<number | null>(null);

  const posts = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return VISTO_EN.map((post) => ({ post, prendas: prendas(post, bySlug) }))
      .filter(({ prendas }) => prendas.length > 0);
  }, [allProducts]);

  // La sección devuelve null hasta que hay catálogo: sin estas deps los hooks
  // corren con el ref vacío y no se enganchan nunca (ver useDragScroll).
  const montada = posts.length > 0;
  const dragRef = useDragScroll([montada]);
  const revealRef = useReveal([montada]);

  if (posts.length === 0) return null;
  const sel = abierto !== null ? posts[abierto] : null;

  return (
    <section className="py-10 md:py-14" ref={revealRef}>
      {/* Misma línea que el Shop the look: encabezado pegado a los bordes y
          tira a todo el ancho (arranca alineada al título y se va por el borde). */}
      <div className="reveal rd1 px-4 md:px-6">
        <SectionHeader title="Visto en" />
      </div>

      <div ref={dragRef} className="reveal rd2 flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar cursor-grab select-none px-4 md:px-6 scroll-px-4 md:scroll-px-6">
        {posts.map(({ post }, i) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setAbierto(i)}
            aria-label={`${post.artista}: ver lo que lleva`}
            className="group relative flex-none w-[62vw] sm:w-[38vw] md:w-[23vw] lg:w-[21vw] aspect-[4/5] overflow-hidden rounded-[6px] bg-bg-alt text-left"
          >
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
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" aria-hidden />
            <span className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2 text-white">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] leading-tight">{post.artista}</span>
              <span className="text-[11px] opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap">Ver lo que lleva</span>
            </span>
          </button>
        ))}
      </div>

      {sel && (
        <PostModal
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
  post: VistoEnPost;
  prendas: Prenda[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function PostModal({ post, prendas, onClose, onPrev, onNext }: ModalProps) {
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
          <img
            key={post.id}
            src={vistoEnFoto(post)}
            alt={post.alt}
            width={1080}
            height={1350}
            decoding="async"
            className="w-full h-full max-h-[46vh] md:max-h-[88vh] object-cover md:aspect-[4/5]"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-between p-2 md:p-3">
            <NavBtn dir="prev" onClick={onPrev} />
            <NavBtn dir="next" onClick={onNext} />
          </div>
        </div>

        <div className="md:order-1 flex flex-col gap-4 p-4 md:p-5 overflow-y-auto min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-light">Visto en</p>
              <h3 className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em] leading-tight mt-1">{post.artista}</h3>
              {post.contexto && <p className="text-[12px] text-foreground/60 mt-1">{post.contexto}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 -mr-2 -mt-1 flex-none grid place-items-center text-foreground/60 hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <ul className="flex flex-col gap-1.5">
            {prendas.map((p) => (
              <li key={p.slug}>
                <a
                  href={p.href}
                  className="group grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center p-2 rounded-[4px] bg-background hover:bg-bg-alt transition-colors"
                >
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
                  <span className="text-[11px] underline underline-offset-[3px] decoration-foreground/40 group-hover:decoration-foreground">Ver</span>
                </a>
              </li>
            ))}
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
