'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'hs-intro-seen';

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');

  // La intro duraba 3,7 s en la primera visita de cada sesión, y en todo ese
  // rato lo único que se ve del sitio es un fondo opaco — el LCP no puede
  // ocurrir hasta que se va. Bajada a ~1,5 s: el gesto de marca es el mismo
  // (el logo se revela de izquierda a derecha y funde), solo que ágil.
  // Los tiempos están encadenados con las transiciones de abajo: el reveal
  // termina a los ~800 ms, ahí arranca el fade de 0,5 s y a los 1.500 ms el
  // overlay ya no existe.
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) { setPhase('done'); return; }
    const t1 = setTimeout(() => setPhase('visible'), 60);
    const t2 = setTimeout(() => setPhase('exit'), 950);
    const t3 = setTimeout(() => { sessionStorage.setItem(SESSION_KEY, '1'); setPhase('done'); }, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const revealed = phase === 'visible';
  const exiting  = phase === 'exit';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: '#F0EEE8', opacity: exiting ? 0 : 1, transition: exiting ? 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
      <div style={{ clipPath: revealed ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)', transition: revealed ? 'clip-path 0.75s cubic-bezier(0.76,0,0.24,1) 0.05s' : 'none' }}>
        <img src="/STYLE&CULTURE BLACK.png" alt="Style & Culture"
          className="w-auto select-none h-[14px] md:h-[28px]" draggable={false} />
      </div>
    </div>
  );
}
