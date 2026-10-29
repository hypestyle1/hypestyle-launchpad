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

export type CyberFondo = 'video-mono' | 'video-color' | 'video-completo' | 'foto';

const FUENTES: Record<
  Exclude<CyberFondo, 'foto'>,
  { desktop: string; mobile: string; poster: string }
> = {
  'video-mono': {
    desktop: '/cyber/hero/desktop-mono.mp4',
    mobile: '/cyber/hero/mobile-mono.mp4',
    poster: '/cyber/hero/desktop-mono.webp',
  },
  'video-color': {
    desktop: '/cyber/hero/desktop-color.mp4',
    mobile: '/cyber/hero/mobile-color.mp4',
    poster: '/cyber/hero/desktop-color.webp',
  },
  // El clip entero, con el cartel del helicóptero legible. SOLO para comparar
  // en local: ese cartel comunica un porcentaje, y la marca no comunica
  // porcentajes (89 de 145 productos tienen sale_price permanente, así que el
  // "precio de lista" contra el que se calcularía nunca se transó).
  'video-completo': {
    desktop: '/cyber/hero/desktop-completo.mp4',
    mobile: '/cyber/hero/desktop-completo.mp4',
    poster: '/cyber/hero/desktop-completo.webp',
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
