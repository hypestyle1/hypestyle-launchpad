'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';

/* 4 PACK REGULAR TEES — la sección comercial del pack en el takeover.

   El motor YA EXISTE y está en producción (lib/promo-pack-regular.ts): cada 4
   Regular individuales en el carrito se cobran al precio del 3 PACK, solo
   durante la ventana del evento. Acá no hay ninguna lógica de descuento
   nueva: esta sección lo EXPLICA y acerca las 4 remeras reales, con talles y
   stock de Woo en vivo (ProductCard, las mismas cards del sitio).

   Sin montos escritos: el precio lo muestran las cards y el carrito. */

const PASOS = [
  { n: '1', t: 'Elegí 4 Regular', d: 'Los colores y talles que quieras, repetidos o distintos.' },
  { n: '2', t: 'Sumalas al carrito', d: 'Las cuatro juntas, como cualquier compra.' },
  { n: '3', t: 'Pagás 3', d: 'El precio se ajusta solo al del 3 PACK. Sin códigos.' },
];

export default function Cyber4Pack({ slugs }: { slugs: string[] }) {
  const { data } = useProducts();

  const productos = useMemo(() => {
    if (!data) return [];
    const bySlug = new Map(data.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
  }, [data, slugs]);

  return (
    <section id="pack" className="bg-background px-4 py-12 text-foreground md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        {/* Encabezado editorial + flatlay real */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.1fr_1fr] md:items-stretch md:gap-6">
          <div className="flex flex-col justify-between rounded-[16px] bg-[#0a0a0a] px-5 py-7 text-white md:px-8 md:py-9">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45 md:text-[11px]">
                Solo durante el evento
              </p>
              <h2 className="text-[30px] font-black uppercase leading-[0.9] tracking-[-0.01em] md:text-[44px]">
                Pagás 3,
                <br />
                llevás 4
              </h2>
              <p className="mt-3 max-w-[380px] text-[13px] leading-[1.55] text-white/60 md:text-[14px]">
                Cuatro Regular Tees al precio del 3 PACK. Las de siempre: las cuatro bases del
                guardarropas Hype, en los cuatro colores.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {PASOS.map((p) => (
                <div key={p.n}>
                  <span className="text-[20px] font-black text-white/25 md:text-[24px]">{p.n}</span>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white md:text-[12px]">
                    {p.t}
                  </p>
                  <p className="mt-0.5 hidden text-[11px] leading-[1.45] text-white/45 md:block">
                    {p.d}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/colecciones/regular-tees"
              className="mt-7 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-white px-8 text-[12px] font-bold uppercase tracking-[0.12em] text-[#0a0a0a] transition-opacity hover:opacity-85 md:w-auto md:self-start"
            >
              Armá tu 4 PACK
            </Link>
          </div>

          <div className="relative min-h-[260px] overflow-hidden rounded-[16px] bg-bg-alt md:min-h-0">
            <Image
              src="/ss27/preview/30-flatlay-regular-tees.webp"
              alt="Regular Tees — los cuatro colores"
              fill
              sizes="(max-width: 768px) 100vw, 46vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Las 4 Regular reales, con talles y stock de Woo */}
        {productos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:mt-8 lg:grid-cols-4 md:gap-x-4">
            {productos.map((p) => (
              <ProductCard
                key={p.slug}
                id={p.slug}
                name={p.name}
                category={p.category}
                price={p.price}
                originalPrice={p.originalPrice}
                image={p.images[0]}
                images={p.images}
                sizes={p.sizes}
                stock={p.stock}
                href={`/producto/${p.slug}`}
                mutedPrice
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
