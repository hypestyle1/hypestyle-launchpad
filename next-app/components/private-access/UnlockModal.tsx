'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import UnlockForm from './UnlockForm';
import AccessGranted from './AccessGranted';
import { PRIVATE_ACCESS_PATH } from '@/lib/private-access/config';
import './private-access.css';

interface Props {
  open: boolean;
  onClose: () => void;
  collectionName: string;
}

/**
 * Modal de desbloqueo. En mobile es un bottom sheet (el teclado empuja el
 * sheet, el botón queda a la vista); en desktop, una card centrada. Vidrio
 * oscuro sobre el sitio desenfocado: se siente como entrar a otro lugar, no
 * como un login.
 */
export default function UnlockModal({ open, onClose, collectionName }: Props) {
  const router = useRouter();
  const [granted, setGranted] = useState<{ name: string | null } | null>(null);

  // Bloquea el scroll del sitio mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !granted) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose, granted]);

  const goToCollection = useCallback(() => {
    router.push(PRIVATE_ACCESS_PATH);
  }, [router]);

  if (!open || typeof document === 'undefined') return null;

  // Portal al body: el banner vive dentro de la "cortina" del home (un
  // contexto de apilamiento con z-10), así que un fixed ahí adentro quedaba
  // debajo del navbar por más z-index que tuviera.
  if (granted) {
    return createPortal(
      <AccessGranted name={granted.name} collectionName={collectionName} onDone={goToCollection} />,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="pa-modal-title">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="pa-backdrop-in absolute inset-0 bg-black/55 backdrop-blur-md cursor-default"
      />

      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6 pointer-events-none">
        <div
          className="pa-sheet-in pa-glass-dark pointer-events-auto relative w-full md:max-w-[460px] text-white rounded-t-[28px] md:rounded-[28px] px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] md:p-10 max-h-[92dvh] overflow-y-auto"
        >
          {/* Agarre del sheet (solo mobile) */}
          <div className="md:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" aria-hidden />

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-4 right-4 md:top-5 md:right-5 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} strokeWidth={1.8} />
          </button>

          <div className="flex items-center gap-2.5 mb-5 md:mb-6">
            <span className="pa-dot" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">SS27 · Private Access</span>
          </div>

          <h2 id="pa-modal-title" className="text-[24px] md:text-[26px] font-semibold tracking-[-0.02em] leading-[1.1] mb-2">
            Acceso exclusivo para Mejores Amigos
          </h2>
          <p className="text-[14px] leading-relaxed text-white/60 mb-7">
            Ingresá tu usuario de Instagram para desbloquear {collectionName}.
          </p>

          <UnlockForm compact autoFocus onGranted={(name) => setGranted({ name })} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
