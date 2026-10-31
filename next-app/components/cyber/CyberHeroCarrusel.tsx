'use client';

import { useEffect, useState } from 'react';

/* Carrusel de fondo del hero de CYBER HYPE: ocho fotos de estudio, 1,8 s cada
   una, con un glitch corto entre toma y toma.

   ── El glitch ───────────────────────────────────────────────────────────────
   Reusa el lenguaje aprobado del wordmark (cyber.css): franjas horizontales
   con `clip-path` que saltan en `steps(1, end)` — sin interpolar, que es lo
   que lo hace glitch y no una cortina — más un corrimiento mínimo en X. Dura
   320 ms sobre 1.800: se siente el corte y no molesta.

   Para que la animación REARRANQUE en cada cambio sin desmontar la <img> (y
   sin que parpadee), la clase alterna entre dos copias idénticas, `-a` y `-b`.
   Cambiar el nombre de la clase es lo que reinicia el keyframe.

   ── Cómo carga ──────────────────────────────────────────────────────────────
   La primera foto es el LCP: va sola en el HTML del servidor, con
   `fetchPriority="high"` y sin lazy (67 KB en mobile). Las demás entran de a
   poco, siempre dos por delante de la que se está viendo, así la carga inicial
   es una sola imagen y el resto llega durante la primera vuelta en vez de
   pedir 8 archivos juntos.

   ── Cuándo NO rota ──────────────────────────────────────────────────────────
   - `prefers-reduced-motion`: queda la primera, fija, y las otras siete ni se
     descargan.
   - Ahorro de datos o 2g/3g: lo mismo.
   - Sin JS: queda la primera (esto es cliente).
   La decisión se toma DESPUÉS de montar, así que el HTML del servidor y el
   primer render del cliente son idénticos: no hay desajuste de hidratación. */

export interface CyberSlide {
  id: string;
  /** La foto ENTERA, en su 3:4 original. En mobile es la única que se ve. */
  src: string;
  /** La compañera del split de DESKTOP (mitad derecha). No se descarga en
   *  mobile: se monta sólo cuando la media query dice que estamos en ≥768. */
  srcB: string;
  alt: string;
}

/** Cuánto dura cada foto. */
const INTERVALO = 1800;

/** Cuánto esperamos después de montar para empezar a traer el resto. */
const ESPERA = 900;

/** Cuántas fotos mantenemos cargadas por delante de la que se ve. */
const ADELANTO = 2;

export function prefiereQuieto(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return false;
  return c.saveData === true || ['2g', 'slow-2g', '3g'].includes(c.effectiveType ?? '');
}

export default function CyberHeroCarrusel({ slides }: { slides: CyberSlide[] }) {
  const [activo, setActivo] = useState(false);
  const [i, setI] = useState(0);
  // ¿Estamos en desktop? Decide si existe la segunda foto del split. Va por JS
  // y no por `hidden md:block` porque un <img> oculto por CSS se descarga
  // igual: así mobile —que está aprobado— no baja ni un byte de más.
  const [esDesktop, setEsDesktop] = useState(false);
  // Cuántas montamos. Arranca en 1: el HTML del servidor lleva solo el LCP.
  const [cargadas, setCargadas] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const leer = () => setEsDesktop(mq.matches);
    leer();
    mq.addEventListener('change', leer);
    return () => mq.removeEventListener('change', leer);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || prefiereQuieto()) return;
    const t = window.setTimeout(() => {
      setCargadas((n) => Math.min(slides.length, Math.max(n, 1 + ADELANTO)));
      setActivo(true);
    }, ESPERA);
    return () => window.clearTimeout(t);
  }, [slides.length]);

  useEffect(() => {
    if (!activo) return;
    const t = window.setInterval(() => {
      setI((n) => {
        const sig = (n + 1) % slides.length;
        setCargadas((c) => Math.min(slides.length, Math.max(c, sig + 1 + ADELANTO)));
        return sig;
      });
    }, INTERVALO);
    return () => window.clearInterval(t);
  }, [activo, slides.length]);

  const visibles = slides.slice(0, cargadas);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {visibles.map((s, n) => {
        const esActual = n === i;
        return (
          <div
            key={s.id}
            className={[
              // Sin z-index: el scrim y el bloque de texto son hermanos
              // POSTERIORES en el DOM y no tienen z propio, así que un z-[1]
              // acá los tapaba y el hero se quedaba sin wordmark ni countdown.
              'absolute inset-0',
              esActual ? 'opacity-100' : 'opacity-0',
              // El glitch corre SOLO sobre la que entra, y alterna de clase
              // para que el keyframe vuelva a empezar en cada cambio.
              esActual && activo ? (i % 2 === 0 ? 'cyber-slide-in-a' : 'cyber-slide-in-b') : '',
            ].join(' ')}
          >
            {/* MOBILE (aprobado, no se toca): una sola foto a sangre.
                DESKTOP: split 50/50 con dos verticales, una por lado — el
                panel es apaisado y una sola foto 3:4 obligaba a ampliarla o a
                dejar medio hero vacío. El contenedor sólo se vuelve grilla
                en ≥768, así que en mobile el markup resultante es idéntico. */}
            <div className="absolute inset-0 md:grid md:grid-cols-2">
              <img
                src={s.src}
                alt={n === 0 ? s.alt : ''}
                {...(n === 0 ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
                className="cyber-hero-foto absolute inset-0 h-full w-full md:relative md:inset-auto"
              />
              {esDesktop && (
                <img
                  src={s.srcB}
                  alt=""
                  loading="lazy"
                  className="cyber-hero-foto hidden h-full w-full md:block"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
