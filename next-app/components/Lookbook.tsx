'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import type { Bloque, Foto, Lookbook as LookbookData, Producto } from '@/lib/lookbooks/types';

type BloqueVideo = Extract<Bloque, { tipo: 'video' }>;
type BloqueReel = Extract<Bloque, { tipo: 'reel' }>;

/**
 * Página de lookbook: el resumen de un shooting profesional de colección
 * (los datos viven en lib/lookbooks/, uno por shooting). Formatos mezclados a
 * propósito, como un lookbook impreso: horizontales a sangre, verticales
 * solas, filas de tres en 4:5 y pares altos en 9:16. Debajo de cada foto, qué
 * lleva puesto y el acceso directo a la ficha; las piezas que todavía no
 * están en Woo quedan con nombre y "Próximamente" (o la `nota` del lookbook,
 * "Agotado" en los de archivo).
 */
function Caption({ producto, href, nota }: Producto) {
  return (
    <figcaption className="mt-2.5 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-3">
      <span className="text-[12px] md:text-[13px] font-medium leading-tight">{producto}</span>
      {href ? (
        <Link href={href} className="shrink-0 text-[10px] md:text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-foreground/60 transition-colors">
          Ver producto
        </Link>
      ) : (
        <span className="shrink-0 text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{nota ?? 'Próximamente'}</span>
      )}
    </figcaption>
  );
}

function FotoBox({ dir, foto, aspect, sizes, priority = false }: { dir: string; foto: Foto; aspect: string; sizes: string; priority?: boolean }) {
  const img = (
    <div className={`relative overflow-hidden bg-neutral-100 ${aspect}`}>
      <Image
        src={`${dir}/${foto.n}.webp`}
        alt={`${foto.producto} — lookbook`}
        fill
        sizes={sizes}
        priority={priority}
        // next/image recomprime a 75 por defecto y sobre un webp ya comprimido se notaba: las fotos salían lavadas.
        quality={90}
        className="object-cover"
      />
    </div>
  );
  return (
    <figure className="reveal">
      {foto.href ? <Link href={foto.href}>{img}</Link> : img}
      <Caption producto={foto.producto} href={foto.href} nota={foto.nota} />
    </figure>
  );
}

/**
 * El film de la colección. Se ve como una foto más hasta que la tocás: recién
 * ahí entra el player, para que la página no cargue el video (ni las cookies
 * de YouTube, cuando es de YouTube) en cada visita.
 */
function Reproductor({
  poster, titulo, aspect, sizes, nota, children,
}: {
  poster: string; titulo: string; aspect: string; sizes: string; nota: string;
  children: React.ReactNode;
}) {
  const [play, setPlay] = useState(false);
  return (
    <figure className="reveal">
      <div className={`relative overflow-hidden bg-black ${aspect}`}>
        {play ? children : (
          <button type="button" onClick={() => setPlay(true)} aria-label={`Reproducir ${titulo}`} className="group absolute inset-0 h-full w-full cursor-pointer">
            <Image src={poster} alt={titulo} fill sizes={sizes} priority quality={90} className="object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center bg-background/85 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 md:h-20 md:w-20">
                {/* Triángulo de play, en el color del texto y sin radius, como el resto del tema. */}
                <span className="ml-1 border-y-[11px] border-l-[18px] border-y-transparent border-l-foreground md:ml-1.5 md:border-y-[13px] md:border-l-[21px]" />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2.5 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-3">
        <span className="text-[12px] md:text-[13px] font-medium leading-tight">{titulo}</span>
        <span className="shrink-0 text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{nota}</span>
      </figcaption>
    </figure>
  );
}

function VideoBox({ dir, b }: { dir: string; b: BloqueVideo }) {
  return (
    <Reproductor poster={`${dir}/${b.poster}.webp`} titulo={b.titulo} aspect="aspect-video" sizes="100vw" nota="El film">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${b.youtube}?autoplay=1&rel=0&modestbranding=1`}
        title={b.titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </Reproductor>
  );
}

function ReelBox({ dir, b }: { dir: string; b: BloqueReel }) {
  return (
    <Reproductor poster={`${dir}/${b.poster}.webp`} titulo={b.titulo} aspect="aspect-[9/16]" sizes="(max-width: 768px) 100vw, 30vw" nota="El reel">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- reel de campaña, sin diálogo que subtitular */}
      <video
        src={`${dir}/${b.mp4}.mp4`}
        poster={`${dir}/${b.poster}.webp`}
        autoPlay
        controls
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    </Reproductor>
  );
}

export default function Lookbook({ data }: { data: LookbookData }) {
  const ref = useReveal();
  const { dir, bloques } = data;

  return (
    <div ref={ref}>
      <section className="px-4 md:px-8 pt-10 md:pt-16 pb-8 md:pb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{data.eyebrow}</p>
        <h1 className="text-[34px] md:text-[56px] font-semibold tracking-[-0.02em] leading-none">{data.title}</h1>
        <p className="mt-4 max-w-[520px] text-[14px] text-muted-foreground leading-relaxed">{data.intro}</p>
      </section>

      <div className="px-4 md:px-8 pb-20 md:pb-28 space-y-10 md:space-y-16">
        {bloques.map((b, i) => {
          if (b.tipo === 'reel') {
            return (
              <div key={b.mp4} className="md:px-[35%]">
                <ReelBox dir={dir} b={b} />
              </div>
            );
          }
          if (b.tipo === 'video') {
            return <VideoBox key={b.youtube} dir={dir} b={b} />;
          }
          if (b.tipo === 'full') {
            return <FotoBox key={b.foto.n} dir={dir} foto={b.foto} aspect="aspect-[3/2]" sizes="100vw" priority={i === 0} />;
          }
          if (b.tipo === 'uno') {
            return (
              <div key={b.foto.n} className="md:px-[25%]">
                <FotoBox dir={dir} foto={b.foto} aspect="aspect-[4/5]" sizes="(max-width: 768px) 100vw, 50vw" priority={i === 0} />
              </div>
            );
          }
          if (b.tipo === 'dos') {
            return (
              <div key={b.fotos[0].n} className="grid grid-cols-2 gap-3 md:gap-6 md:px-[12%]">
                {b.fotos.map((foto) => <FotoBox key={foto.n} dir={dir} foto={foto} aspect="aspect-[9/16]" sizes="(max-width: 768px) 50vw, 38vw" />)}
              </div>
            );
          }
          // Tres: en mobile van dos por fila y la tercera a todo el ancho, en 4:5
          // igual que las otras, para no dejar un hueco.
          return (
            <div key={b.fotos[0].n} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {b.fotos.map((foto, j) => (
                <div key={foto.n} className={j === 2 ? 'col-span-2 md:col-span-1' : ''}>
                  <FotoBox dir={dir} foto={foto} aspect="aspect-[4/5]" sizes="(max-width: 768px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
