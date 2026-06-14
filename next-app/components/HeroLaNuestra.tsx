'use client';

import Link from 'next/link';

// Página del producto a la que lleva el botón.
const PRODUCT_URL = '/producto/la-nuestra-jersey-mundial-26';

// TODO: reemplazar por los assets finales del lanzamiento.
//  - Video de fondo: subir a /public/hero/la-nuestra-bg.mp4
//  - Imagen del contenedor: subir a /public/hero/la-nuestra-card.jpg
// Por ahora apuntan a assets existentes para poder previsualizar el layout.
const VIDEO_SRC = '/gate-bg.mp4';                       // TEMP
const CARD_IMG  = '/banner-halfzip-hero.png';           // TEMP

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
                     flex flex-col items-center justify-center text-center"
          style={{ backgroundImage: `url('${CARD_IMG}')` }}
        >
          {/* leve oscurecido del contenedor para contraste del texto */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          <div className="relative flex flex-col items-center gap-6 px-6">
            <h1 className="text-white font-bold uppercase leading-[0.95] tracking-tight
                           text-[44px] sm:text-[64px] md:text-[88px]">
              LA NUESTRA
            </h1>
            <Link
              href={PRODUCT_URL}
              className="bg-white text-black text-[12px] md:text-[13px] font-bold uppercase tracking-[0.16em]
                         px-9 py-4 hover:bg-white/85 transition-colors duration-300"
            >
              Ver producto
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
