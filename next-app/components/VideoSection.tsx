'use client';

import { useEffect, useRef, useState } from 'react';

const VIDEO_ID = '62_jeoVaUUY'; // "Hype - NAPOLI TEEs"
const EMBED_SRC =
  `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1`;

export default function VideoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(false);

  // El iframe de YouTube se monta recién cuando la sección está por entrar en
  // pantalla. Montado desde el arranque (como estaba antes) traía ~1,1 MB de
  // player + ~2,2 MB de video y bloqueaba el hilo principal ~1,1 s, todo antes
  // de que el usuario llegara siquiera a esta sección — que está a media página
  // del pliegue. Mientras tanto se ve el poster, que es un frame del mismo
  // video servido desde nuestro dominio (40 KB en webp).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setLoad(true); return; }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoad(true); io.disconnect(); } },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-[1450px] mx-auto relative overflow-hidden bg-black bg-cover bg-center"
      style={{ aspectRatio: '16/9', backgroundImage: "url('/video-section-poster.webp')" }}
    >
      {load && (
        <iframe
          src={EMBED_SRC}
          title="Napoli Tees — Hypestyle"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none"
          style={{ transform: 'scale(1.05)' }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-14">
        <a
          href="/colecciones/napoli/"
          className="px-8 py-3 border border-white text-white text-[11px] md:text-[12px] uppercase tracking-[0.18em] hover:bg-white hover:text-black transition-colors duration-300"
        >
          Ver Napoli Tees
        </a>
      </div>
    </section>
  );
}
