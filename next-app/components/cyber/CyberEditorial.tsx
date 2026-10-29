import Image from 'next/image';
import Link from 'next/link';

/* Tres tarjetas editoriales de categoría, después de Mystery Archive.

   ── Por qué tres y no una ───────────────────────────────────────────────────
   Antes era una sola foto enorme para una sola categoría: ocupaba media
   pantalla para empujar a un único lado. Tres tarjetas del mismo tamaño
   ocupan lo mismo y ofrecen tres caminos, con la misma estructura que las
   Mystery Boxes de arriba — misma proporción, mismo radio, misma lectura.

   ── Las fotos, y por qué estas ──────────────────────────────────────────────
   Todo material real de Hype, nada de stock:
   - HOODIES: la del banner SS27 que ya estaba aprobada.
   - REMERAS: UGC de la sección "Así se usa" — alguien de verdad con la
     remera puesta en la calle. Es el tipo de foto que mejor convierte porque
     muestra la prenda usada, no exhibida.
   - PANTALONES: del lookbook Faith, el único banco donde el jogger es
     protagonista y se ve entero; en el resto del material los pantalones
     quedan cortados o tapados por la prenda de arriba.
   Las tres son de cuerpo entero o medio cuerpo con la prenda centrada, así
   que conviven aunque vengan de sesiones distintas. El `posicion` de cada una
   está elegido para que el recorte no corte cabezas ni la prenda.

   ── Mobile ──────────────────────────────────────────────────────────────────
   Las tres quedan en UNA línea horizontal con scroll y snap: una tarjeta
   protagonista por vez y se asoma la siguiente, que es lo que avisa que hay
   más. Sin autoplay, sin apilarlas y sin comprimir las tres en una pantalla.
   En desktop, tres columnas iguales. */

export interface TarjetaCategoria {
  id: string;
  src: string;
  alt: string;
  kicker: string;
  titulo: string;
  href: string;
  cta: string;
  posicion: string;
}

export const CYBER_CATEGORIAS_EDITORIAL: TarjetaCategoria[] = [
  {
    id: 'hoodies',
    src: '/ss27/banner/15-distressed.webp',
    alt: 'Hype Distressed Hoodie washed grey',
    kicker: 'Spring Summer 27',
    titulo: 'Hoodies',
    href: '/hoodies',
    cta: 'Ver hoodies',
    posicion: '50% 28%',
  },
  {
    id: 'tees',
    src: '/shop-the-look/mica-ogcjm.webp',
    alt: 'Remera Only God Can Judge Me, en la calle',
    kicker: 'Así se usa',
    titulo: 'Remeras',
    href: '/tees',
    cta: 'Ver remeras',
    posicion: '50% 30%',
  },
  {
    // Cambiada el 29/10: en la anterior el jogger quedaba a media pierna y
    // tapado por el hoodie. Acá el conjunto se ve entero, de la cintura a
    // los pies, que es lo que tiene que vender la tarjeta de Pantalones.
    id: 'pants',
    src: '/cyber/categorias/pants-cami.webp',
    alt: 'Conjunto Hype: hoodie y sweatpant',
    kicker: 'Así se usa',
    titulo: 'Pantalones',
    href: '/pants',
    cta: 'Ver pantalones',
    posicion: '50% 55%',
  },
];

export default function CyberEditorial({ tarjetas }: { tarjetas: TarjetaCategoria[] }) {
  return (
    <section className="bg-[#0a0a0a] px-4 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1400px]">
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {tarjetas.map((t) => (
            <li
              key={t.id}
              className="w-[82vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none"
            >
              <Link
                href={t.href}
                className="group relative block aspect-[4/5] overflow-hidden rounded-[16px] focus-visible:outline-white"
              >
                <Image
                  src={t.src}
                  alt={t.alt}
                  fill
                  sizes="(max-width: 768px) 82vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ objectPosition: t.posicion }}
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <span className="absolute inset-x-4 bottom-4 md:inset-x-5 md:bottom-5">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">
                    {t.kicker}
                  </span>
                  <span className="mt-1 block text-[24px] font-black uppercase leading-[0.95] tracking-[-0.01em] text-white md:text-[28px]">
                    {t.titulo}
                  </span>
                  <span className="mt-3 inline-flex h-[42px] items-center justify-center rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity group-hover:opacity-85">
                    {t.cta}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
