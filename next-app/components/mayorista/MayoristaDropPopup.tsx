'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { MayoristaDropProps } from './MayoristaDropBanner';
import '@/components/private-access/private-access.css';

const STORAGE_PREFIX = 'hype_may_drop_popup:';

function alreadySeen(key: string): boolean {
  try { return window.localStorage.getItem(STORAGE_PREFIX + key) === '1'; } catch { return false; }
}
function markSeen(key: string) {
  try { window.localStorage.setItem(STORAGE_PREFIX + key, '1'); } catch { /* sin storage: vuelve a salir, no rompe */ }
}

/**
 * Popup del drop nuevo para mayoristas: sale una vez por drop y por
 * navegador, al entrar al catálogo. En mobile es un bottom sheet; en desktop,
 * una card con la foto al costado. Mismo vidrio oscuro que el modal de
 * Private Access.
 */
export default function MayoristaDropPopup({ drop, onCta }: { drop: MayoristaDropProps; onCta: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (alreadySeen(drop.key)) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [drop.key]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() { markSeen(drop.key); setOpen(false); }
  function go() { close(); onCta(); }

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="may-drop-title">
      <button aria-label="Cerrar" onClick={close} className="pa-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-md cursor-default" />

      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none">
        <div className="pa-sheet-in pa-glass-dark pointer-events-auto relative w-full md:max-w-[760px] text-white rounded-t-[24px] md:rounded-[24px] overflow-hidden max-h-[92dvh] overflow-y-auto md:flex">
          <div className="relative h-[200px] md:h-auto md:w-[42%] md:shrink-0 bg-white/5">
            <Image src="/ss27/banner/01-duo.webp" alt={`${drop.name} · campaña`} fill sizes="(min-width: 768px) 320px, 100vw" className="object-cover object-[50%_30%]" priority />
          </div>

          <div className="relative px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] md:p-10 md:flex-1">
            <button onClick={close} aria-label="Cerrar" className="absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={18} strokeWidth={1.8} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <span className="pa-dot pa-dot-green" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">Exclusivo mayoristas</span>
            </div>
            <h2 id="may-drop-title" className="text-[24px] md:text-[28px] font-semibold tracking-[-0.02em] leading-[1.08] pr-8">
              {drop.name}{drop.subtitle ? ` ${drop.subtitle}` : ''} ya está en tu catálogo
            </h2>
            <p className="text-[14px] leading-relaxed text-white/65 mt-3">
              {drop.beforePublic
                ? `La ves antes que nadie: sale al público el ${drop.publicOpenLabel}. Pedila ahora y llegá con la percha armada.`
                : 'Recién salida. Pedila ahora y llegá con la percha armada.'}
            </p>
            <p className="text-[13px] leading-relaxed text-white/50 mt-2">
              {drop.count} modelos a tu precio de siempre: 50% del PVP. Tiradas cortas: los que piden primero se aseguran los talles.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
              <button onClick={go} className="h-[48px] px-6 rounded-full bg-white text-[#0a0a0a] text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-colors">
                Ver la colección
              </button>
              <button onClick={close} className="h-[48px] px-6 rounded-full text-white/60 text-[12px] font-semibold uppercase tracking-[0.2em] hover:text-white transition-colors">
                Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
