'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import CollectionIndex from '@/components/collection/CollectionIndex';
import { useScrollSpy } from '@/components/collection/useScrollSpy';
import { useProducts, type NormalizedProduct } from '@/hooks/useProducts';

/**
 * Best sellers con la piel del sistema nuevo y el MISMO patrón sticky que las
 * colecciones (pedido 12/10): índice propio con scrollspy y handoff, curaduría
 * organizada por drop/familia en vez de una lista plana, y grilla densa de
 * 3 columnas en mobile / 5 en desktop.
 *
 * Curaduría 12/10 (reemplaza a BEST_SELLERS_SLUGS en esta vista):
 * - Sin repetidos con otras secciones del home (las Regular/packs viven en
 *   Esenciales; HStars, polos, Napoli, Faith camo y Ladytribal en FW26).
 * - Cada familia junta: No Service completo (4 remeras + hoodie), la línea
 *   No Love Only Style con la Baby Come Back (82u, no estaba en el home),
 *   Fe (Find Jesus 61u + Christ Reigns), Lettering y Mesh/Realtree.
 * - Lo agotado curado NO se saca (gorra Baby Come Back, grises): la card avisa
 *   "Sin stock" — es la señal de qué reestockear.
 * Stock Woo al 12/10 en los comentarios.
 */

const GRUPOS: { id: string; label: string; slugs: string[] }[] = [
  {
    // Primero (pedido 12/10): los gráficos de siempre, 2 filas completas.
    id: 'clasicos',
    label: 'Clásicos',
    slugs: [
      'jersey-fileteado-x-alfredo-genovese',  // 16u — primero (pedido 12/10)
      'per-aspera-ad-astra-black-tee',        // 40u
      'per-aspera-ad-astra-zippo',            // 0u — vuelve a pedido, reestockear
      'aerogrey-tees',                        // 103u — el mayor stock del catálogo
      'aeropink-tees',                        // 101u
      'honda-white-tee',                      // 36u
      'honda-black-tee',                      // 32u
      'hypestation-white-tee',                // 18u
      'hypestation-black-tee',                // 16u
      'skyline-tee',                          // 8u
      'race-tee',                             // 7u
      'knitted-tshirt-sand',                  // 3u
    ],
  },
  {
    // Los 4 colorways juntos + los tanktops (misma familia musculosa) para
    // cerrar la fila de 5.
    id: 'sleeveless',
    label: 'Sleeveless',
    slugs: [
      'sleeveless-ranglan-white',         // 21u
      'sleeveless-ranglan-militar-green', // 20u
      'sleeveless-ranglan-grey',          // 19u
      'sleeveless-ranglan-black',         // 15u
      'tanktops',                         // 10u
    ],
  },
  {
    id: 'no-service',
    label: 'No Service',
    slugs: [
      'no-service-for-the-faithless-hoodie', // 10u
      'no-service-for-the-faithless-white',  // 14u
      'no-service-for-the-faithless-black',  // 2u
      'no-service-for-the-faithless-grey',   // 0u — reestockear
      'no-service-for-the-faithless-green',  // 1u
    ],
  },
  {
    id: 'no-love',
    label: 'No Love, Only Style',
    slugs: [
      'baby-come-back-tees',          // 82u — no estaba en el home
      'no-love-only-style-tops',      // 13u
      'jort-cargo-realtree-pink',     // 2u — la bermuda rosa
      'baby-come-back-black',         // 0u — reestockear
      'trucker-cap-baby-come-back',   // 0u — candidata a reestock (pedido del dueño)
    ],
  },
  {
    id: 'fe',
    label: 'Fe',
    slugs: [
      'find-jesus-longsleeve-black',          // 61u
      'christ-reigns-tee',                    // 31u
      'jesus-heart-tee',                      // 16u
      'he-die-so-i-could-live-hoodie',        // 4u
      'he-died-so-i-could-live-melange-hoodie', // 4u
    ],
  },
  {
    id: 'lettering',
    label: 'Lettering',
    slugs: [
      'lettering-black-longsleeve',   // 61u (salió del estante FW26 para no repetir)
      'lettering-graphite-hoodie',    // 2u
      'lettering-pink-jort',          // 2u
      'lettering-graphite-jort',      // 1u
      'lettering-melange-jort',       // 0u — reestockear
    ],
  },
  {
    id: 'mesh',
    label: 'Mesh',
    slugs: [
      'mesh-realtree-tee',        // 16u
      'mesh-camo-grey-tee',       // 11u
      'mesh-camo-blue-tee',       // 7u
      'mesh-realtree-pink-tee',   // 3u
      'jort-cargo-realtree-beige',// 2u
    ],
  },
  {
    // Pedido 12/10. Hoy TODOS los accesorios del catálogo están en stock 0:
    // este grupo es el tablero de reestock a cielo abierto (la gorra Baby Come
    // Back queda en su línea No Love; el Zippo con Per Aspera en Clásicos).
    id: 'accesorios',
    label: 'Accesorios',
    slugs: [
      'camo-cap',                       // 0u — reestockear
      'beanie-camo',                    // 0u
      'trucker-cap-no-faith-no-glory',  // 0u
      'chain-hype',                     // 0u
      'pack-x3-medias-hype',            // 0u
    ],
  },
];

// Una sola fila deslizable por grupo (pedido 12/10): en mobile se ven ~3
// cards y en desktop ~5, y el resto se descubre deslizando. El bleed -mx/px
// hace que la fila corte en el borde de la pantalla, como los carruseles de
// la home. Cards en modo `dense` para que badge y precios no se pisen.
const ROW = 'flex gap-x-1.5 md:gap-x-2.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 md:-mx-6 md:px-6';
const CELL = 'flex-none snap-start w-[31%] md:w-[23%] lg:w-[18.5%]';

const enStock = (p: NormalizedProduct) => Object.values(p.stock).some((s) => s !== 'out');

const ARROW =
  'hidden lg:flex absolute top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm ' +
  'border border-border shadow-[0_2px_12px_rgba(0,0,0,0.12)] items-center justify-center text-foreground ' +
  'hover:bg-white transition-colors';

/**
 * Fila horizontal con flechas en desktop (pedido 13/10: con mouse no había
 * forma visible de deslizar). En mobile/touch siguen el swipe y el snap; las
 * flechas aparecen solo cuando hay más contenido hacia ese lado.
 */
function FilaDeslizable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canIzq, setCanIzq] = useState(false);
  const [canDer, setCanDer] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanIzq(el.scrollLeft > 4);
      setCanDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const mover = (dir: number) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <div className="relative">
      <div ref={ref} className={ROW}>{children}</div>
      {canIzq && (
        <button onClick={() => mover(-1)} aria-label="Anterior" className={`${ARROW} left-0`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 3L5 8l5 5" /></svg>
        </button>
      )}
      {canDer && (
        <button onClick={() => mover(1)} aria-label="Siguiente" className={`${ARROW} right-0`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      )}
    </div>
  );
}

export default function BestSellersShelf() {
  const { data: allProducts = [] } = useProducts(0);
  const { active, onAnchorClick } = useScrollSpy(GRUPOS.map((g) => g.id), 'bs-');

  const grupos = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return GRUPOS.map((g) => {
      const items = g.slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[];
      // Lo agotado va al fondo de la fila: primero lo que se puede comprar.
      return { ...g, items: [...items.filter(enStock), ...items.filter((p) => !enStock(p))] };
    }).filter((g) => g.items.length > 0);
  }, [allProducts]);

  if (grupos.length === 0) return null;

  return (
    <section id="back-in-stock" className="px-4 md:px-6 pt-8 md:pt-10 pb-6 scroll-mt-[var(--offset)]">
      <CollectionIndex
        title="Best sellers"
        items={grupos.map((g) => ({ id: g.id, label: g.label }))}
        active={active}
        prefix="bs-"
        cta={{ href: '/productos', label: 'Ver todo' }}
        onSelect={onAnchorClick}
      />
      {grupos.map((g) => (
        <div key={g.id} id={`bs-${g.id}`} className="scroll-mt-[calc(var(--offset)+120px)] mb-10 md:mb-14 last:mb-0">
          <div className="flex items-baseline gap-2 mb-4 md:mb-5">
            <h3 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{g.label}</h3>
            <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{g.items.length}</span>
          </div>
          <FilaDeslizable>
            {g.items.map((p) => (
              <div key={p.slug} className={CELL}>
                <ProductCard {...p} dense />
              </div>
            ))}
          </FilaDeslizable>
        </div>
      ))}
    </section>
  );
}
