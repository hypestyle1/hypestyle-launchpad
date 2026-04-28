'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'hs-intro-seen';

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) { setPhase('done'); return; }
    const t1 = setTimeout(() => setPhase('visible'), 80);
    const t2 = setTimeout(() => setPhase('exit'), 2900);
    const t3 = setTimeout(() => { sessionStorage.setItem(SESSION_KEY, '1'); setPhase('done'); }, 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const revealed = phase === 'visible';
  const exiting  = phase === 'exit';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: '#F0EEE8', opacity: exiting ? 0 : 1, transition: exiting ? 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
      <div style={{ clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)', transition: revealed ? 'clip-path 1.1s cubic-bezier(0.76,0,0.24,1) 0.1s' : 'none' }}>
        <img src="/STYLE&CULTURE BLACK.png" alt="Style & Culture"
          className="w-auto select-none h-[14px] md:h-[28px]" draggable={false} />
      </div>
    </div>
  );
}
