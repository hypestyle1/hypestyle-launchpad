'use client';

import Link from 'next/link';

// Página del producto a la que lleva el botón.
const PRODUCT_URL = '/producto/la-nuestra-jersey-mundial-26';

// Video de fondo del lanzamiento (optimizado a 1080p para web).
const VIDEO_SRC = '/hero/la-nuestra-bg.mp4';
// Imagen del contenedor (analógica de Río, corregida de rotación).
const CARD_IMG  = '/hero/la-nuestra-card.jpg';

export default function HeroLaNuestra() {
  return (
    <section className="relative w-full h-[100svh] overflow-hidden bg-bg-dark">
      {/* Video de fondo full-screen */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Velo sutil para legibilidad del contenido */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Contenedor 1220px con imagen de fondo */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          className="relative w-full max-w-[1220px] aspect-[1220/620] overflow-hidden bg-cover bg-center
                     rounded-[24px] flex flex-col items-center justify-center text-center"
          style={{ backgroundImage: `url('${CARD_IMG}')` }}
        >
          {/* oscurecido para contraste del texto sobre el cielo claro */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />

          <div className="relative flex flex-col items-center gap-7 px-6">
            <h1 className="text-white font-bold uppercase leading-[0.95] tracking-tight
                           text-[44px] sm:text-[64px] md:text-[88px]
                           [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]">
              LA NUESTRA
            </h1>
            {/* Botón liquid glass (estilo Apple): vidrio esmerilado + borde sutil + redondeado */}
            <Link
              href={PRODUCT_URL}
              className="group relative overflow-hidden rounded-full px-9 py-4
                         text-white text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.16em]
                         bg-white/15 backdrop-blur-xl border border-white/30
                         shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]
                         transition-all duration-300 hover:bg-white/25 hover:border-white/50"
            >
              <span className="relative z-10">Ver producto</span>
              {/* reflejo superior tipo vidrio */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2
                               bg-gradient-to-b from-white/25 to-transparent" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
