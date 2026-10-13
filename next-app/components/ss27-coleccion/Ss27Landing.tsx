'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import CollectionIndex from '@/components/collection/CollectionIndex';
import { useScrollSpy } from '@/components/collection/useScrollSpy';
import { SS27_CATEGORIAS } from '@/lib/ss27-categorias';
import { SS27_HERO_IMAGES, toCardProps, type Ss27Product } from '@/lib/ss27-coleccion';

/**
 * El cuerpo de /colecciones/ss27 con la colección abierta (rediseño 2026):
 * la landing habla el idioma de la home SS27 — encabezado editorial compacto
 * (productos en la primera pantalla), el MISMO índice sticky del home con las
 * mismas categorías (lib/ss27-categorias), grilla con aire, orden curado por
 * precio de lista, y las fotos de campaña como banda editorial entre
 * secciones en vez de tapón de entrada.
 */

const GRID = 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9';
const PREFIX = 'col-ss27-';
const cat = (p: Ss27Product) => `${p.category} ${p.name}`.toLowerCase();
const listPrice = (p: Ss27Product) => p.originalPrice ?? p.price;

export default function Ss27Landing({ products }: { products: Ss27Product[] }) {
  const { groups, proximamente } = useMemo(() => {
    const left = products.filter((p) => !p.comingSoon);
    const groups = SS27_CATEGORIAS.map((c) => {
      const items = left.filter((p) => c.test(cat(p)));
      for (const p of items) left.splice(left.indexOf(p), 1);
      return { id: c.id, label: c.label, items: items.slice().sort((a, b) => listPrice(b) - listPrice(a)) };
    }).filter((g) => g.items.length > 0);
    return { groups, proximamente: products.filter((p) => p.comingSoon) };
  }, [products]);

  const nav = useMemo(
    () => [...groups.map((g) => ({ id: g.id, label: g.label })), ...(proximamente.length ? [{ id: 'proximamente', label: 'Próximamente' }] : [])],
    [groups, proximamente.length],
  );
  const { active, onAnchorClick } = useScrollSpy(nav.map((x) => x.id), PREFIX);
  const forSale = products.length - proximamente.length;

  return (
    <section className="px-4 md:px-6 pt-6 md:pt-8 pb-6">
      {/* Encabezado editorial compacto: el display del sistema en vez de la
          banda bold uppercase. Corto a propósito: los productos entran en la
          primera pantalla (BM-01). */}
      <header className="pt-2 pb-6 md:pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">
          Colección · Part 01
        </p>
        <h1 className="text-[34px] md:text-[56px] font-semibold tracking-[-0.035em] leading-[1.02]">
          Spring Summer 27
        </h1>
        <p className="text-[14px] text-muted-foreground mt-3 max-w-md leading-relaxed">
          Boxy tees, waffle longsleeves y hoodies lavados. La primera parte de la temporada, en producción limitada.
          <span className="block mt-1 text-[12px] tabular-nums">{forSale} producto{forSale !== 1 ? 's' : ''}</span>
        </p>
      </header>

      <CollectionIndex
        title="Spring Summer 27"
        shortTitle="SS27"
        items={nav}
        active={active}
        prefix={PREFIX}
        onSelect={onAnchorClick}
      />

      {groups.map((g, gi) => (
        <div key={g.id} id={`${PREFIX}${g.id}`} className="scroll-mt-[calc(var(--offset)+120px)] mb-12 md:mb-16">
          {/* Las fotos de campaña como banda editorial entre la primera y la
              segunda sección, en vez de tapar la entrada. */}
          {gi === 1 && (
            <div className="-mx-4 md:-mx-6 mb-10 md:mb-14 grid grid-cols-3 gap-px bg-white">
              {SS27_HERO_IMAGES.map((img) => (
                <div key={img.src} className="relative aspect-[4/5] bg-bg-alt">
                  <Image src={img.src} alt={img.alt} fill sizes="34vw" quality={75} className="object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-baseline gap-2 mb-4 md:mb-5">
            <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{g.label}</h2>
            <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{g.items.length}</span>
          </div>
          <div className={GRID}>
            {g.items.map((p) => (
              <ProductCard key={p.slug} {...toCardProps(p)} badge={toCardProps(p).badge ?? 'New In'} mutedPrice mountMargin="400px" />
            ))}
          </div>
        </div>
      ))}

      {proximamente.length > 0 && (
        <div id={`${PREFIX}proximamente`} className="scroll-mt-[calc(var(--offset)+120px)]">
          <div className="flex items-baseline gap-2 mb-4 md:mb-5">
            <h2 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">Próximamente</h2>
            <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{proximamente.length}</span>
          </div>
          <div className={GRID}>
            {proximamente.map((p) => (
              <ProductCard key={p.slug} {...toCardProps(p)} mountMargin="400px" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
