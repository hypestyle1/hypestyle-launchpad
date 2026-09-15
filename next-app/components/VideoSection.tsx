import LazyVideo from './LazyVideo';

/**
 * Film FW26 ("Final Film | Rio de Janeiro") a sangre completa, entre Shop the
 * Look y Básicos.
 *
 * Antes era un iframe de YouTube dentro de un marco 16:9 con max-width. El
 * film es 4:3, así que YouTube lo encajaba con bandas negras a los lados,
 * elegía una resolución baja para el autoplay mudo y superponía su título y
 * logo. Ahora el mp4 se sirve desde nuestro dominio (recomprimido con ffmpeg,
 * mudo, CRF 30) y `object-cover` lo recorta para llenar el bloque sea cual sea
 * su proporción — mismo criterio que el hero.
 *
 * Proporción del bloque: en mobile 4:3 (la del film, no se recorta nada); en
 * desktop 16:9, recortando arriba y abajo. Se carga recién al acercarse
 * (LazyVideo) y en pantallas chicas va la versión de 720p (3 MB vs 6 MB).
 */
const VIDEO_DESKTOP = '/video/fw26-final-film-1080.mp4';
const VIDEO_MOBILE = '/video/fw26-final-film-720.mp4';
const POSTER = '/video/fw26-final-film-poster.webp';

export default function VideoSection() {
  return (
    <section className="relative w-full overflow-hidden bg-black aspect-[4/3] md:aspect-[16/9]">
      <LazyVideo
        src={VIDEO_DESKTOP}
        srcMobile={VIDEO_MOBILE}
        poster={POSTER}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-14">
        <a
          href="/colecciones/fw26/"
          className="px-8 py-3 border border-white text-white text-[11px] md:text-[12px] uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors duration-300"
        >
          Ver FW26
        </a>
      </div>
    </section>
  );
}
