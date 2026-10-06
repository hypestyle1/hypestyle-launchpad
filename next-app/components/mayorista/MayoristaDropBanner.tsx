'use client';

import Image from 'next/image';
import { PRIVATE_BANNER_IMAGES } from '@/lib/private-access/banner-images';
import type { MayoristaDropInfo } from '@/lib/mayorista-drop';
import '@/components/private-access/private-access.css';

export type MayoristaDropProps = MayoristaDropInfo & { count: number };

/** Texto del drop, compartido entre el banner y el popup. */
export function dropText(drop: MayoristaDropProps): string {
  return drop.beforePublic
    ? `La colección nueva ya está en tu catálogo, antes que en la web. Sale al público el ${drop.publicOpenLabel}: pedila ahora y llegá con la percha armada.`
    : 'La colección nueva ya está en tu catálogo. Tiradas cortas, sin reposición asegurada.';
}

/**
 * Banner del drop nuevo en el portal mayorista (lib/mayorista-drop.ts). Mismo
 * lenguaje que el de Private Access en el home: vidrio charcoal con el
 * resplandor verde en una esquina, y abajo la tira de fotos de la colección.
 */
export default function MayoristaDropBanner({ drop, onCta, onCatalog }: {
  drop: MayoristaDropProps;
  onCta: () => void;
  onCatalog: () => void;
}) {
  const images = PRIVATE_BANNER_IMAGES;
  return (
    <section aria-label={`${drop.name} · acceso anticipado`} className="pa-glass-charcoal relative overflow-hidden [overflow:clip] rounded-[16px] sm:rounded-[22px] text-white mb-8">
      <div className="pa-glow-dark" aria-hidden />
      <div className="pa-grain" aria-hidden />

      <div className="relative px-6 sm:px-10 pt-8 sm:pt-10 flex flex-col md:flex-row md:items-end gap-6 md:gap-12">
        <div className="md:flex-1">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="pa-dot pa-dot-green" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
              {drop.beforePublic ? 'Acceso anticipado · Solo mayoristas' : 'Nuevo drop'}
            </span>
          </div>
          <h1 className="font-bold uppercase leading-[0.92] tracking-[-0.035em]" style={{ fontSize: 'clamp(26px, 6.4vw, 48px)' }}>
            <span className="block text-white">{drop.name}</span>
            {drop.subtitle && <span className="block text-white/45">{drop.subtitle}</span>}
          </h1>
        </div>

        <div className="md:w-[380px] md:shrink-0">
          <p className="text-[13px] sm:text-[14px] leading-relaxed text-white/70">{dropText(drop)}</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-3">
            {drop.count} {drop.count === 1 ? 'modelo' : 'modelos'} · tu precio: 50% del PVP
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button onClick={onCta} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-white text-[#0a0a0a] hover:bg-white/90 transition-colors">
              Ver la colección →
            </button>
            <button onClick={onCatalog} className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide rounded-full border border-white/30 text-white hover:border-white transition-colors">
              Todo el catálogo
            </button>
          </div>
        </div>
      </div>

      {/* Tira de fotos: la misma de /private-access, más baja. */}
      <div className="relative pa-strip mt-8 pb-6 sm:pb-8">
        <div className="pa-strip-track">
          {[...images, ...images].map((img, i) => (
            <div
              key={i}
              className="relative shrink-0 aspect-[4/5] h-[180px] sm:h-[240px] overflow-hidden rounded-[10px] sm:rounded-[12px] bg-white/5"
              aria-hidden={i >= images.length || undefined}
            >
              <Image src={img.src} alt={i >= images.length ? '' : img.alt} fill sizes="(min-width: 640px) 192px, 144px" className="object-cover" priority={i < 4} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
