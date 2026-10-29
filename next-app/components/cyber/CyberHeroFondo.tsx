'use client';

import { useEffect, useState } from 'react';
import LazyVideo from '@/components/LazyVideo';

/* Fondo del hero de CYBER HYPE: foto editorial o video, con la imagen siempre
   debajo.

   ── Cómo carga, y por qué no arruina el LCP ─────────────────────────────────
   El video lo monta `LazyVideo`, el componente que el sitio ya usa para los
   videos editoriales del home: mantiene el póster como fondo y recién crea el
   <video> cuando un IntersectionObserver lo ve entrar (el hero está en
   pantalla, así que entra enseguida, pero después del primer pintado). El
   elemento que mide el LCP es el póster — una imagen de 37–53 KB —, no el
   video. Un primer intento propio usaba `useCriticalPainted` y el video nunca
   aparecía: ese aviso depende del `load` de la página entera y una home con el
   catálogo completo tarda demasiado en dispararlo.

   ── Qué pasa si algo falla ──────────────────────────────────────────────────
   - `prefers-reduced-motion`: no se monta el video. Queda la imagen fija.
   - Ahorro de datos o conexión 2g/3g: no se monta. Un hero de 480 KB en una
     conexión mala es peor que una foto.
   - Sin JS: queda la imagen (LazyVideo es cliente).
   - La decisión se toma DESPUÉS de montar, así que el HTML del servidor y el
     primer render del cliente son idénticos: no hay desajuste de hidratación.

   `autoplay muted playsInline loop` (los pone LazyVideo) es obligatorio para
   que un celular reproduzca solo; los archivos ya vienen sin pista de audio. */

export type CyberFondo = 'boom-mono' | 'boom-color' | 'loop-mono' | 'loop-color' | 'foto';

/* Las cuatro variantes del clip COMPLETO (5,04 s, las escenas enteras, con el
   cartel del helicóptero sin recortar ni tapar — pedido del 29/10).

   `boom-*` dura 10,08 s: el clip hacia adelante y después hacia atrás. Es la
   recomendada. El clip termina con el cartel en primer plano y empieza con el
   skyline, así que un loop normal corta de golpe entre dos imágenes muy
   distintas; el boomerang vuelve al cuadro inicial y el ciclo cierra sin
   salto. Se verificó cuadro por cuadro que el tramo invertido no se vea
   artificial: el helicóptero es una silueta lejana en una toma aérea lenta y
   el movimiento hacia atrás no se percibe.

   `loop-*` es el clip tal cual, en loop de 5,04 s, con el corte visible. Está
   para comparar.

   El recorte de mobile NO es centrado (x = 70% del rango): centrado cortaba el
   cartel justo en "CYBER". Verificado en los dos momentos del clip. */
const FUENTES: Record<
  Exclude<CyberFondo, 'foto'>,
  { desktop: string; mobile: string; poster: string }
> = {
  'boom-mono': {
    desktop: '/cyber/hero/boom-desktop-mono.mp4',
    mobile: '/cyber/hero/boom-mobile-mono.mp4',
    poster: '/cyber/hero/boom-desktop-mono.webp',
  },
  'boom-color': {
    desktop: '/cyber/hero/boom-desktop-color.mp4',
    mobile: '/cyber/hero/boom-mobile-color.mp4',
    poster: '/cyber/hero/boom-desktop-color.webp',
  },
  'loop-mono': {
    desktop: '/cyber/hero/loop-desktop-mono.mp4',
    mobile: '/cyber/hero/loop-mobile-mono.mp4',
    poster: '/cyber/hero/loop-desktop-mono.webp',
  },
  'loop-color': {
    desktop: '/cyber/hero/loop-desktop-color.mp4',
    mobile: '/cyber/hero/loop-mobile-color.mp4',
    poster: '/cyber/hero/loop-desktop-color.webp',
  },
};

const FOTO_DESKTOP = '/lookbook-fw26/hero/6428.webp';
const FOTO_MOBILE = '/lookbook-fw26/hero/6442.webp';

function prefiereQuieto(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return false;
  return c.saveData === true || ['2g', 'slow-2g', '3g'].includes(c.effectiveType ?? '');
}

export default function CyberHeroFondo({ fondo }: { fondo: CyberFondo }) {
  const src = fondo === 'foto' ? null : FUENTES[fondo];
  // Arranca en false para que servidor y cliente pinten lo mismo.
  const [conVideo, setConVideo] = useState(false);

  useEffect(() => {
    if (!src) return;
    if (prefiereQuieto()) return;
    setConVideo(true);
  }, [src]);

  if (src && conVideo) {
    return (
      <LazyVideo
        src={src.desktop}
        srcMobile={src.mobile}
        poster={src.poster}
        posterClassName="absolute inset-0 bg-cover bg-center"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  // Sin video: la imagen. El póster del clip elegido, o la foto editorial.
  return (
    <>
      <img
        src={src ? src.poster : FOTO_DESKTOP}
        alt="Editorial Hype"
        fetchPriority="high"
        className="absolute inset-0 hidden h-full w-full object-cover md:block"
        style={{ objectPosition: src ? '50% 45%' : '66% 30%' }}
      />
      <img
        src={src ? src.poster : FOTO_MOBILE}
        alt="Editorial Hype"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover md:hidden"
        style={{ objectPosition: src ? '50% 45%' : '55% 18%' }}
      />
    </>
  );
}
