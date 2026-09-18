'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useReveal } from '@/hooks/useReveal';
import type { Foto, Lookbook as LookbookData, Producto } from '@/lib/lookbooks/types';

/**
 * Página de lookbook: el resumen de un shooting profesional de colección
 * (los datos viven en lib/lookbooks/, uno por shooting). Formatos mezclados a
 * propósito, como un lookbook impreso: horizontales a sangre, verticales
 * solas, filas de tres en 4:5 y pares altos en 9:16. Debajo de cada foto, qué
 * lleva puesto y el acceso directo a la ficha; las piezas que todavía no
 * están en Woo quedan con nombre y "Próximamente".
 */
function Caption({ producto, href }: Producto) {
  return (
    <figcaption className="mt-2.5 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-3">
      <span className="text-[12px] md:text-[13px] font-medium leading-tight">{producto}</span>
      {href ? (
        <Link href={href} className="shrink-0 text-[10px] md:text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-foreground/60 transition-colors">
          Ver producto
        </Link>
      ) : (
        <span className="shrink-0 text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Próximamente</span>
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
      <Caption producto={foto.producto} href={foto.href} />
    </figure>
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
