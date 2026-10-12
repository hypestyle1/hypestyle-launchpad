'use client';

import { useMemo } from 'react';
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

// Densa a pedido: 3 col mobile / 5 desktop. Cada grupo trae 5 productos, así
// la fila de desktop cierra exacta; en mobile quedan 2 filas (3+2).
const GRID = 'grid grid-cols-3 lg:grid-cols-5 gap-x-1.5 md:gap-x-2.5 gap-y-5 lg:gap-y-7';

export default function BestSellersShelf() {
  const { data: allProducts = [] } = useProducts(0);
  const { active, onAnchorClick } = useScrollSpy(GRUPOS.map((g) => g.id), 'bs-');

  const grupos = useMemo(() => {
    const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
    return GRUPOS.map((g) => ({
      ...g,
      items: g.slugs.map((s) => bySlug.get(s)).filter(Boolean) as NormalizedProduct[],
    })).filter((g) => g.items.length > 0);
  }, [allProducts]);

  if (grupos.length === 0) return null;

  return (
    <section id="back-in-stock" className="px-4 md:px-6 pt-8 md:pt-10 pb-6 scroll-mt-[var(--offset)]">
      <CollectionIndex
        title="Best sellers"
        items={grupos.map((g) => ({ id: g.id, label: g.label }))}
        active={active}
        prefix="bs-"
        cta={{ href: '/productos/', label: 'Ver todo' }}
        onSelect={onAnchorClick}
      />
      {grupos.map((g) => (
        <div key={g.id} id={`bs-${g.id}`} className="scroll-mt-[calc(var(--offset)+120px)] mb-10 md:mb-14 last:mb-0">
          <div className="flex items-baseline gap-2 mb-4 md:mb-5">
            <h3 className="text-[20px] md:text-[26px] font-semibold tracking-[-0.03em] leading-none">{g.label}</h3>
            <span className="text-[12px] md:text-[13px] text-muted-foreground tabular-nums">{g.items.length}</span>
          </div>
          <div className={GRID}>
            {g.items.map((p) => (
              <ProductCard key={p.slug} {...p} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
