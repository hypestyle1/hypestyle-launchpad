'use client';

import { useEffect, useState } from 'react';
import LazyVideo from '@/components/LazyVideo';
import CyberHeroCarrusel, { prefiereQuieto, type CyberSlide } from './CyberHeroCarrusel';

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

export type CyberFondo =
  | 'boom-mono'
  | 'boom-color'
  | 'loop-mono'
  | 'loop-color'
  /** Fotografía de calle de Lucas García, en blanco y negro. El default. */
  | 'lucas'
  /** La editorial FW26 (Rio), el fondo anterior. */
  | 'foto';

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
  Exclude<CyberFondo, 'foto' | 'lucas'>,
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

/* Las fotos fijas. Cada variante trae su propia toma y su propio recorte para
   desktop y mobile: una foto vertical estirada a 16:9 pierde al sujeto, y una
   horizontal recortada a 9:16 deja al modelo fuera de cuadro.

   `lucas` son dos tomas distintas de la misma sesión de calle, A COLOR
   (decisión del 29/10) con apenas un punto de contraste: la sesión ya es
   sobria de por sí —calle, hormigón, prendas oscuras— así que no necesita el
   blanco y negro para convivir con la identidad monocroma de la campaña.
   La de mobile es el plano sentado (el sujeto arriba, el escalón oscuro abajo
   donde apoya el texto); la de desktop tiene al modelo a la izquierda y la
   puerta negra a la derecha, que es el aire donde respira el bloque. */
const FOTOS: Record<'lucas' | 'foto', { desktop: string; mobile: string; posD: string; posM: string }> = {
  lucas: {
    desktop: '/cyber/hero/lucas-desktop.webp',
    mobile: '/cyber/hero/lucas-mobile.webp',
    posD: '50% 42%',
    posM: '50% 10%',
  },
  foto: {
    desktop: '/lookbook-fw26/hero/6428.webp',
    mobile: '/lookbook-fw26/hero/6442.webp',
    posD: '66% 30%',
    posM: '55% 18%',
  },
};

/* Las ocho fotos del carrusel (fondo `lucas`, el default): la selección de
   `Redes & Pauta/CYBERHYPE!/fotos hero`.

   SIN RECORTE: cada una sale entera, en su 3:4 original, y un solo archivo
   sirve a los dos anchos. La versión anterior tenía dos recortes por foto
   —9:16 y 16:9— y para conseguirlos había que cortar al modelo a la cintura y
   ampliarlo: la prenda se veía incompleta y la estampa caía justo donde está
   el texto. El encaje lo resuelve `.cyber-hero-foto` en cyber.css.

   Receta reproducible: `_claude/herramientas/cyber-hero-fotos.mjs`.
   Peso: 37–109 KB por foto, 631 KB las ocho. La primera es el LCP (37 KB);
   el resto las trae el carrusel sobre la marcha. */
const IDS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];
const foto = (id: string) => `/cyber/hero/slides/${id}.webp`;

/* En mobile se ve `src`. En desktop el hero es un split 50/50 y la mitad
   derecha es `srcB`: la foto SIGUIENTE de la lista. Así cada paso del carrusel
   cambia las dos mitades y ninguna pareja se repite dentro de la vuelta. */
const SLIDES: CyberSlide[] = IDS.map((id, n) => ({
  id,
  src: foto(id),
  srcB: foto(IDS[(n + 1) % IDS.length]),
  alt: n === 0 ? 'Prendas de la campaña Cyber Hype' : '',
}));

export default function CyberHeroFondo({ fondo }: { fondo: CyberFondo }) {
  const esVideo = fondo !== 'foto' && fondo !== 'lucas';
  const video = esVideo ? FUENTES[fondo as Exclude<CyberFondo, 'foto' | 'lucas'>] : null;
  const foto = FOTOS[esVideo ? 'foto' : (fondo as 'lucas' | 'foto')];
  // Arranca en false para que servidor y cliente pinten lo mismo.
  const [conVideo, setConVideo] = useState(false);

  useEffect(() => {
    if (!video) return;
    if (prefiereQuieto()) return;
    setConVideo(true);
  }, [video]);

  // `lucas` (el default) ya no es una foto sola: es el carrusel editorial.
  // Los otros modos (?hero=boom-*|loop-*|foto) siguen igual que antes.
  if (fondo === 'lucas') return <CyberHeroCarrusel slides={SLIDES} />;

  if (video && conVideo) {
    return (
      <LazyVideo
        src={video.desktop}
        srcMobile={video.mobile}
        poster={video.poster}
        posterClassName="absolute inset-0 bg-cover bg-center"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  // Sin video: la foto. El póster del clip elegido, o la fotografía fija.
  return (
    <>
      <img
        src={video ? video.poster : foto.desktop}
        alt="Editorial Hype"
        fetchPriority="high"
        className="absolute inset-0 hidden h-full w-full object-cover md:block"
        style={{ objectPosition: video ? '50% 45%' : foto.posD }}
      />
      <img
        src={video ? video.poster : foto.mobile}
        alt="Editorial Hype"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover md:hidden"
        style={{ objectPosition: video ? '50% 45%' : foto.posM }}
      />
    </>
  );
}
