'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'hs-intro-seen';

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');

  // La intro duraba 3,7 s en la primera visita de cada sesión, y en todo ese
  // rato lo único que se ve del sitio es un fondo opaco — el LCP no puede
  // ocurrir hasta que se va. Se bajó a ~1,5 s y quedó demasiado corta: el
  // logo terminaba de revelarse y 150 ms después ya estaba fundiendo, así
  // que no se llegaba a leer. Ahora dura ~2,7 s, con el logo quieto y entero
  // durante casi un segundo.
  // Los tiempos están encadenados con las transiciones de abajo: el reveal
  // termina a los ~1.100 ms, el logo queda a la vista hasta los 2.000 ms, ahí
  // arranca el fade de 0,7 s y a los 2.700 ms el overlay ya no existe.
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) { setPhase('done'); return; }
    const t1 = setTimeout(() => setPhase('visible'), 60);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(() => { sessionStorage.setItem(SESSION_KEY, '1'); setPhase('done'); }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 'done') return null;

  const revealed = phase === 'visible';
  const exiting  = phase === 'exit';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: '#F0EEE8', opacity: exiting ? 0 : 1, transition: exiting ? 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)' : 'none' }}>
      {/* Al salir el logo queda revelado: si volviera a recortarse, se borraría
          justo mientras funde. */}
      <div style={{ clipPath: revealed || exiting ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)', transition: revealed ? 'clip-path 1s cubic-bezier(0.76,0,0.24,1) 0.05s' : 'none' }}>
        <img src="/STYLE&CULTURE BLACK.png" alt="Style & Culture"
          className="w-auto select-none h-[14px] md:h-[28px]" draggable={false} />
      </div>
    </div>
  );
}
