import Image from 'next/image';
import Link from 'next/link';

/* Separador editorial entre categorías.

   Qué hace acá: corta la sucesión de grillas con una imagen grande de la
   marca y, de paso, empuja a una categoría. No es un banner promocional —no
   lleva precios, ni porcentajes, ni cuenta regresiva—: es la pausa visual que
   hace que el catálogo no se lea como un listado infinito.

   Las fotos son del lookbook y del banco SS27 ya publicados en el sitio; el
   `href` apunta siempre a una página real. Si alguna vez hay material propio
   del Cyber, se reemplaza la ruta y nada más. */

export default function CyberEditorial({
  src,
  alt,
  kicker,
  titulo,
  href,
  cta,
  posicion = '50% 35%',
}: {
  src: string;
  alt: string;
  kicker: string;
  titulo: string;
  href: string;
  cta: string;
  /** object-position, para elegir qué parte de la foto manda en el recorte. */
  posicion?: string;
}) {
  return (
    <section className="bg-[#0a0a0a] px-4 py-3 md:px-10 md:py-4">
      <Link
        href={href}
        className="group relative mx-auto block aspect-[4/3] max-w-[1400px] overflow-hidden rounded-[16px] sm:aspect-[16/9] lg:aspect-[21/9]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          style={{ objectPosition: posicion }}
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute inset-x-5 bottom-5 md:inset-x-9 md:bottom-8">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-white/70 md:text-[11px]">
            {kicker}
          </span>
          <span className="mt-1.5 block text-[24px] font-black uppercase leading-[0.95] tracking-[-0.01em] text-white md:text-[38px]">
            {titulo}
          </span>
          <span className="mt-3 inline-flex h-[44px] items-center justify-center rounded-full bg-white px-7 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity group-hover:opacity-85 md:text-[12px]">
            {cta}
          </span>
        </span>
      </Link>
    </section>
  );
}
