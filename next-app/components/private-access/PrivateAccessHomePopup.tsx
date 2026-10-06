'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';
import UnlockModal from './UnlockModal';
import { PRIVATE_ACCESS_FLAG_COOKIE } from '@/lib/private-access/config';
import { paTrack } from '@/lib/private-access/analytics';
import './private-access.css';

interface Props {
  /** Resuelto en el servidor: fuera de la preventa no existe. */
  active: boolean;
  collectionName: string;
  discountPct: number;
  /** `domingo 11.10` */
  publicOpenLabel: string;
}

const STORAGE_KEY = 'hype_pa_home_popup';
/** Vuelve a salir como mucho una vez por día. */
const EVERY_MS = 24 * 3600_000;
const DELAY_MS = 2500;

function hasFlagCookie(): boolean {
  try { return document.cookie.split('; ').some(c => c === `${PRIVATE_ACCESS_FLAG_COOKIE}=1`); } catch { return false; }
}
function seenRecently(): boolean {
  try { return Date.now() < Number(window.localStorage.getItem(STORAGE_KEY) || 0); } catch { return false; }
}
function markSeen() {
  try { window.localStorage.setItem(STORAGE_KEY, String(Date.now() + EVERY_MS)); } catch { /* sin storage: no rompe */ }
}

/**
 * Popup del home durante la preventa de Mejores Amigos: avisa que la
 * colección ya está en preventa y cuándo abre al público. Sale una vez por
 * día, no sale a quien ya desbloqueó, y el botón abre el mismo modal de
 * desbloqueo que el banner.
 */
export default function PrivateAccessHomePopup({ active, collectionName, discountPct, publicOpenLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  useEffect(() => {
    if (!active || hasFlagCookie() || seenRecently()) return;
    const t = setTimeout(() => { setOpen(true); markSeen(); paTrack('private_access_popup_view'); }, DELAY_MS);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!active) return null;

  const unlock = () => { setOpen(false); setUnlockOpen(true); paTrack('private_access_popup_click'); };

  return (
    <>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="pa-home-popup-title">
          <button aria-label="Cerrar" onClick={() => setOpen(false)} className="pa-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-md cursor-default" />

          <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none">
            <div className="pa-sheet-in pa-glass-dark pointer-events-auto relative w-full md:max-w-[800px] text-white rounded-t-[24px] md:rounded-[24px] overflow-hidden max-h-[92dvh] overflow-y-auto md:flex">
              <div className="relative h-[220px] md:h-auto md:w-[42%] md:shrink-0 bg-white/5">
                <Image src="/ss27/banner/01-duo.webp" alt={`${collectionName} · campaña`} fill sizes="(min-width: 768px) 320px, 100vw" className="object-cover object-[50%_30%]" priority />
              </div>

              <div className="relative px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] md:p-10 md:flex-1">
                <button onClick={() => setOpen(false)} aria-label="Cerrar" className="absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={18} strokeWidth={1.8} />
                </button>

                <div className="flex items-center gap-2.5 mb-4">
                  <span className="pa-dot pa-dot-green" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">{collectionName} · Preventa</span>
                </div>
                <h2 id="pa-home-popup-title" className="text-[24px] md:text-[28px] font-semibold tracking-[-0.02em] leading-[1.08] pr-8">
                  Estamos en la preventa de Mejores Amigos
                </h2>
                <p className="text-[14px] leading-relaxed text-white/65 mt-3">
                  La colección nueva ya está disponible con {discountPct}% off para la lista de Mejores Amigos de Instagram.
                </p>
                <p className="text-[14px] leading-relaxed text-white mt-2">
                  El drop abre para todos el {publicOpenLabel}.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
                  <button onClick={unlock} className="h-[48px] px-6 whitespace-nowrap rounded-full bg-white text-[#0a0a0a] text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-colors">
                    Desbloquear acceso
                  </button>
                  <button onClick={() => setOpen(false)} className="h-[48px] px-6 whitespace-nowrap rounded-full text-white/60 text-[12px] font-semibold uppercase tracking-[0.2em] hover:text-white transition-colors">
                    Espero al {publicOpenLabel.split(' ')[0]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
      <UnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} collectionName={collectionName} />
    </>
  );
}
