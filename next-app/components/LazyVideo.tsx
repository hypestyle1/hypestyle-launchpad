'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Video de fondo (mudo, en loop) que recién se pide cuando está por entrar en
 * pantalla.
 *
 * El `preload="metadata"` de un <video autoPlay> no sirve de nada: el navegador
 * entiende que el video se va a reproducir solo y se lo baja entero apenas
 * parsea el elemento, esté donde esté en el documento. En el home eso significa
 * que los dos videos editoriales (New In y La Nuestra), que están varias
 * pantallas abajo, competían por ancho de banda con el hero desde el primer
 * pintado.
 *
 * Acá el <video> ni existe hasta que un IntersectionObserver lo ve acercarse
 * (200px de margen, así llega cargado). Mientras tanto queda el poster de
 * fondo, que es lo mismo que se ve en el primer frame.
 */
export default function LazyVideo({
  src,
  poster,
  className = '',
  posterClassName = 'absolute inset-0 bg-cover bg-center',
}: {
  src: string;
  poster: string;
  className?: string;
  posterClassName?: string;
}) {
  // El observer va sobre el poster, no sobre un wrapper: un wrapper con
  // display:contents no tiene caja propia y el IntersectionObserver nunca lo
  // ve entrar. El poster, en cambio, ocupa la sección entera.
  const posterRef = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = posterRef.current;
    if (!el) return;
    // Sin IntersectionObserver (navegadores viejos) se carga de una: peor
    // performance, pero nunca una sección vacía.
    if (typeof IntersectionObserver === 'undefined') { setLoad(true); return; }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoad(true); io.disconnect(); } },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={posterRef} className={posterClassName} style={{ backgroundImage: `url('${poster}')` }} aria-hidden />
      {load && (
        <video
          className={className}
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
        />
      )}
    </>
  );
}
