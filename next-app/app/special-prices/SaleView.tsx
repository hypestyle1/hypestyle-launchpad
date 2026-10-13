'use client';

import Image from 'next/image';
import Link from 'next/link';
import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CatalogHeader from '@/components/collection/CatalogHeader';
import type { NormalizedProduct } from '@/hooks/useProducts';

/**
 * La vista de /special-prices (los datos y el SEO siguen en page.tsx, server
 * con ISR). Rediseño 2026: cabecera editorial compacta con el contador real y
 * el tope de descuento, Destacados y Todo el sale con la grilla aireada del
 * sistema, y una banda editorial de dos fotos REALES de prendas rebajadas y
 * con stock (shooting marado) que linkean a sus fichas. Los badges −% se
 * mantienen: acá la claridad comercial es el contenido.
 */

const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/';

// Prendas rebajadas Y con stock al 12/10 — si una se agota o sale del sale,
// cambiar la foto por otra que cumpla las dos condiciones.
const SALE_BANDA: { src: string; alt: string; label: string; href: string }[] = [
  { src: WP + '2026/07/DSC03189-scaled.jpg', alt: 'SweatPant Black HStars en campaña', label: 'SweatPant Black HStars · −10%', href: '/producto/sweatpant-black-hstars' },
  { src: WP + '2026/08/hype-marado-DSC03306-scaled.jpg', alt: 'Lamb of God Pink Tee en campaña', label: 'Lamb of God Pink Tee · −10%', href: '/producto/lamb-of-god-pink-tee' },
];

const GRID_AIRE = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9';

type Props = {
  destacados: NormalizedProduct[];
  resto: NormalizedProduct[];
  maxOff: number;
};

const card = (p: NormalizedProduct) => (
  <ProductCard
    key={p.slug}
    id={p.slug}
    name={p.name}
    category={p.category}
    price={p.price}
    originalPrice={p.originalPrice}
    badge={p.badge}
    image={p.image}
    images={p.images}
    sizes={p.sizes}
    stock={p.stock}
    href={p.href}
  />
);

export default function SaleView({ destacados, resto, maxOff }: Props) {
  const total = destacados.length + resto.length;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <section className="px-4 md:px-6 pt-2 pb-10 md:pb-14">
          <CatalogHeader
            kicker="Precios especiales"
            title="Sale"
            count={total}
            description={total > 0 ? `Hasta ${maxOff}% OFF, mientras haya stock. Sin relleno: lo agotado no se muestra.` : 'Mientras haya stock.'}
          />

          {destacados.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-baseline gap-2 mb-4 md:mb-5">
                <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">Destacados</h2>
                <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{destacados.length}</span>
              </div>
              <div className={GRID_AIRE}>{destacados.map(card)}</div>
            </div>
          )}

          {/* Banda editorial: dos rebajadas reales, a sangre, linkeando a la ficha. */}
          <div className="-mx-4 md:-mx-6 mb-12 md:mb-16 grid grid-cols-2 gap-px bg-white">
            {SALE_BANDA.map((b) => (
              <Link key={b.href} href={b.href} className="group relative block aspect-[3/4] md:aspect-[4/3] overflow-hidden bg-bg-alt">
                <Image src={b.src} alt={b.alt} fill sizes="50vw" quality={70} className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]" />
                <span className="absolute left-3 bottom-3 md:left-5 md:bottom-5 text-white text-[11px] md:text-[13px] font-semibold uppercase tracking-[0.02em] underline underline-offset-4 [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
                  {b.label}
                </span>
              </Link>
            ))}
          </div>

          {resto.length > 0 && (
            <div>
              <div className="flex items-baseline gap-2 mb-4 md:mb-5">
                <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">Todo el sale</h2>
                <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{resto.length}</span>
              </div>
              <div className={GRID_AIRE}>{resto.map(card)}</div>
            </div>
          )}

          {total === 0 && (
            <p className="text-center text-muted-foreground py-20">El sale vuelve pronto. Mientras tanto, mirá las novedades.</p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
