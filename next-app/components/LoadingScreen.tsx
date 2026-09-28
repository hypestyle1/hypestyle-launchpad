'use client';

import { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'hs-intro-seen';

// El logo se arma con franjas verticales del mismo PNG, para que el enfoque lo
// recorra de izquierda a derecha. Los tiempos van de la mano con los de
// globals.css ("Intro de marca").
const STRIPS = 14;
const STRIP_FIRST_MS = 150;
const STRIP_STEP_MS = 55;
const EXIT_AT_MS = 1700;
const DONE_AT_MS = 2800;

// A dónde viaja el logo al terminar: el STYLE&CULTURE del hero.
const TARGET = '[data-intro-target]';

type Phase = 'idle' | 'run' | 'travel' | 'fade' | 'done';

/**
 * Intro de marca. Se muestra una vez por sesión, sobre un vidrio que deja ver
 * el sitio desenfocado.
 *
 *  1. El enfoque recorre el logo letra por letra.
 *  2. En el home, el logo viaja hasta el STYLE&CULTURE del hero y pasa de
 *     negro a blanco mientras el vidrio se disuelve: la intro termina siendo
 *     el logo del sitio llegando a su lugar.
 *  3. En cualquier otra página no hay logo al que llegar: se desenfoca donde
 *     está y el vidrio se disuelve igual.
 *
 * La intro tapa el sitio ~2,8 s en la primera carga de cada sesión, y el LCP de
 * esa carga no puede ocurrir antes. Llegó a durar 1,5 s y no se alcanzaba a
 * leer el logo.
 */
export default function LoadingScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) { setPhase('done'); return; }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const start = setTimeout(() => setPhase('run'), 60);
    const exit = setTimeout(() => {
      const from = logoRef.current;
      const to = document.querySelector<HTMLElement>(TARGET);
      const a = from?.getBoundingClientRect();
      const b = to?.getBoundingClientRect();
      // Sin destino, con el destino fuera de pantalla (alguien scrolleó) o con
      // "reducir movimiento" activado, el logo no viaja.
      const reachable = a && b && b.width > 0 && b.bottom > 0 && b.top < window.innerHeight;
      if (reduced || !from || !reachable) { setPhase('fade'); return; }
      from.style.transform = `translate3d(${b.left - a.left}px, ${b.top - a.top}px, 0) scale(${b.width / a.width})`;
      setPhase('travel');
    }, EXIT_AT_MS);
    const done = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setPhase('done');
    }, DONE_AT_MS);

    return () => { clearTimeout(start); clearTimeout(exit); clearTimeout(done); };
  }, []);

  if (phase === 'done') return null;

  return (
    <>
      <div id="hs-intro" className="hs-intro" data-phase={phase} aria-hidden="true" suppressHydrationWarning>
        <div className="hs-intro-glass" />
        <div className="hs-intro-logo" ref={logoRef}>
          {Array.from({ length: STRIPS }, (_, i) => (
            <div
              key={i}
              className="hs-intro-strip"
              style={{
                backgroundPosition: `${(i / (STRIPS - 1)) * 100}% 0`,
                animationDelay: `${STRIP_FIRST_MS + i * STRIP_STEP_MS}ms`,
              }}
            />
          ))}
        </div>
      </div>
      {/* El HTML llega con la intro puesta, y React tarda en arrancar. Si la
          sesión ya la vio, se esconde acá mismo, antes de que se llegue a
          pintar: si no, cada página mostraría un instante de vidrio. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${SESSION_KEY}'))document.getElementById('hs-intro').style.display='none'}catch(e){}`,
        }}
      />
    </>
  );
}
