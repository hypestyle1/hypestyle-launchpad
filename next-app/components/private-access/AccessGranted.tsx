'use client';

import { useEffect, useState } from 'react';
import './private-access.css';

interface Props {
  name?: string | null;
  collectionName: string;
  onDone: () => void;
}

const HOLD_MS = 1700;
const LEAVE_MS = 450;

/**
 * Pantalla breve entre el desbloqueo y la colección. Negro pleno, dos
 * palabras, una línea que avanza. Sin confetti. Con prefers-reduced-motion
 * no anima y se va antes.
 */
export default function AccessGranted({ name, collectionName, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = reduced ? 700 : HOLD_MS;
    const t1 = setTimeout(() => setLeaving(true), hold);
    const t2 = setTimeout(onDone, hold + (reduced ? 0 : LEAVE_MS));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pa-granted ${leaving ? 'is-leaving' : ''} fixed inset-0 z-[210] bg-[#050505] text-white flex flex-col items-center justify-center px-6`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40 mb-6 pa-granted-sub" style={{ animationDelay: '0s' }}>
        SS27 · Private Access
      </p>
      <h2 className="text-center leading-[0.9] font-bold uppercase tracking-[-0.04em]" style={{ fontSize: 'clamp(46px, 13vw, 104px)' }}>
        <span className="block pa-granted-word">Access</span>
        <span className="block pa-granted-word text-white/92">Granted</span>
      </h2>
      <div className="mt-8 text-center pa-granted-sub">
        <p className="text-[12px] md:text-[13px] font-medium uppercase tracking-[0.18em] text-white/60">
          {collectionName} · Private Preview
        </p>
        {name && (
          <p className="mt-2 text-[13px] text-white/40">Bienvenido, {name}.</p>
        )}
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-px bg-white/10">
        <div className="pa-granted-line h-full w-full bg-white/70" />
      </div>
    </div>
  );
}
