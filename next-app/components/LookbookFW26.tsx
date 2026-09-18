'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useReveal } from '@/hooks/useReveal';

/**
 * Lookbook FW26: resumen de la produ en Rio de Janeiro (fotos de Fili, mayo
 * 2026), sin retocar. Es una página, no una sección del home: el hero del home
 * usa las horizontales y linkea acá.
 *
 * Formatos mezclados a propósito, como un lookbook impreso: horizontales a
 * sangre (3:2), filas de tres en 4:5 y pares altos en 9:16. Debajo de cada
 * foto, qué lleva puesto y el acceso directo a la ficha; las piezas que
 * todavía no están en Woo quedan con nombre y "Próximamente".
 */
type Producto = { producto: string; href?: string };

const CAMO: Producto = { producto: 'Camo Full Set', href: '/producto/camo-full-set-combo/' };
const PINK: Producto = { producto: 'Zip Hoodie Pink', href: '/producto/zip-hoodie-pink/' };
const JORT: Producto = { producto: 'Lettering Pink Jort', href: '/producto/lettering-pink-jort/' };
const JERSEY: Producto = { producto: 'La Nuestra — Jersey Mundial 26', href: '/producto/la-nuestra-jersey-mundial-26/' };
const MESH: Producto = { producto: 'Mesh Camo Blue Tee', href: '/producto/mesh-camo-blue-tee/' };
const VENEZUELA: Producto = { producto: 'Stars For Venezuela Hoodie', href: '/producto/stars-for-venezuela-hoodie/' };
const HOODIE_PINK: Producto = { producto: 'Hoodie Pink', href: '/producto/hoodie-pink/' };
// Piezas de la produ que aún no están cargadas en el catálogo.
const GREY: Producto = { producto: 'Grey HStars Set' };
const WHITE_TOP: Producto = { producto: 'White Crop Top' };
const WHITE_TEE: Producto = { producto: 'White Tee' };
const DUO: Producto = { producto: 'White Tee + Black Tee' };

type Foto = Producto & { n: string };
type Bloque =
  | { tipo: 'full'; foto: Foto }
  | { tipo: 'tres'; fotos: [Foto, Foto, Foto] }
  | { tipo: 'dos'; fotos: [Foto, Foto] };

const f = (n: string, p: Producto): Foto => ({ n, ...p });

const BLOQUES: Bloque[] = [
  { tipo: 'full', foto: f('6209', CAMO) },
  { tipo: 'tres', fotos: [f('6198', CAMO), f('6296', GREY), f('6309', GREY)] },
  { tipo: 'full', foto: f('6316', GREY) },
  { tipo: 'dos', fotos: [f('6335', GREY), f('6351', GREY)] },
  { tipo: 'tres', fotos: [f('6372', WHITE_TOP), f('6385', VENEZUELA), f('6416', VENEZUELA)] },
  { tipo: 'full', foto: f('6428', VENEZUELA) },
  { tipo: 'tres', fotos: [f('6439', VENEZUELA), f('6456', VENEZUELA), f('6458', VENEZUELA)] },
  { tipo: 'full', foto: f('6519', PINK) },
  { tipo: 'tres', fotos: [f('6487', PINK), f('6495', PINK), f('6501', PINK)] },
  { tipo: 'full', foto: f('6533', PINK) },
  { tipo: 'tres', fotos: [f('6540', PINK), f('6572', PINK), f('6592', PINK)] },
  { tipo: 'full', foto: f('6697', JORT) },
  { tipo: 'tres', fotos: [f('6718', MESH), f('6725', MESH), f('6720', MESH)] },
  { tipo: 'tres', fotos: [f('6765', WHITE_TEE), f('6781', WHITE_TEE), f('6794', WHITE_TEE)] },
  { tipo: 'dos', fotos: [f('6837', DUO), f('6841', DUO)] },
  { tipo: 'tres', fotos: [f('6857', HOODIE_PINK), f('6862', HOODIE_PINK), f('6852', HOODIE_PINK)] },
  { tipo: 'full', foto: f('6947', JERSEY) },
  { tipo: 'tres', fotos: [f('6898', JERSEY), f('6908', JERSEY), f('6929', JERSEY)] },
  { tipo: 'tres', fotos: [f('7003', JERSEY), f('7016', JERSEY), f('6977', JERSEY)] },
  { tipo: 'full', foto: f('6210', CAMO) },
];

function Caption({ producto, href }: Producto) {
  return (
    <figcaption className="mt-2.5 flex items-baseline justify-between gap-3">
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

function FotoBox({ foto, aspect, sizes, priority = false }: { foto: Foto; aspect: string; sizes: string; priority?: boolean }) {
  const img = (
    <div className={`relative overflow-hidden bg-neutral-100 ${aspect}`}>
      <Image
        src={`/lookbook-fw26/book/${foto.n}.webp`}
        alt={`Lookbook FW26 — ${foto.producto}`}
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

export default function LookbookFW26() {
  const ref = useReveal();

  return (
    <div ref={ref}>
      <section className="px-4 md:px-8 pt-10 md:pt-16 pb-8 md:pb-12">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Style&amp;Culture</p>
        <h1 className="text-[34px] md:text-[56px] font-semibold tracking-[-0.02em] leading-none">Lookbook FW26</h1>
        <p className="mt-4 max-w-[520px] text-[14px] text-muted-foreground leading-relaxed">
          La colección FW26 puesta, en Rio de Janeiro. Fotos de Fili.
        </p>
      </section>

      <div className="px-4 md:px-8 pb-20 md:pb-28 space-y-10 md:space-y-16">
        {BLOQUES.map((b, i) => {
          if (b.tipo === 'full') {
            return <FotoBox key={b.foto.n} foto={b.foto} aspect="aspect-[3/2]" sizes="100vw" priority={i === 0} />;
          }
          if (b.tipo === 'dos') {
            return (
              <div key={b.fotos[0].n} className="grid grid-cols-2 gap-3 md:gap-6 md:px-[12%]">
                {b.fotos.map((foto) => <FotoBox key={foto.n} foto={foto} aspect="aspect-[9/16]" sizes="(max-width: 768px) 50vw, 38vw" />)}
              </div>
            );
          }
          // Tres: en mobile van dos por fila y la tercera a todo el ancho, en 4:5
          // igual que las otras, para no dejar un hueco.
          return (
            <div key={b.fotos[0].n} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {b.fotos.map((foto, j) => (
                <div key={foto.n} className={j === 2 ? 'col-span-2 md:col-span-1' : ''}>
                  <FotoBox foto={foto} aspect="aspect-[4/5]" sizes="(max-width: 768px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
