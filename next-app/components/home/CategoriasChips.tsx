'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useProducts } from '@/hooks/useProducts';
import FlowHoverButton from '@/components/ui/flow-hover-button';

/**
 * Atajos por categoría, apenas debajo del hero (9/11). Versión clara de
 * "Explorá por categoría" de la landing de Cyber (CyberNavCategorias): una
 * fila de píldoras con una miniatura real del producto, que llevan directo a
 * las páginas de catálogo con filtros que ya existen.
 *
 * Mismo botón que el resto de la home (FlowHoverButton: vidrio beige y relleno
 * negro en diagonal al hover). Miniaturas oscuras o de color, nunca blancas
 * (pedido de Valentín): las blancas se perdían contra el fondo claro de la
 * píldora. Todas con stock al 9/11.
 *
 * Mobile: tira deslizable (tamaño y espaciado aprobados). Desktop: píldoras
 * más grandes y más aire entre ellas, en una línea centrada.
 *
 * La miniatura sale del catálogo (slugFoto); si ese producto no viene, la
 * píldora queda solo con texto.
 */

const ACCESOS = [
  { label: 'Hoodies', href: '/hoodies', slugFoto: 'hoodie-black-hstars' },
  { label: 'Remeras', href: '/tees', slugFoto: 'napoli-tee-azul' },
  { label: 'Longsleeves', href: '/longsleeves', slugFoto: 'find-jesus-longsleeve-black' },
  { label: 'Pantalones', href: '/pants', slugFoto: 'sweatpant-black-hstars' },
  { label: 'Jorts', href: '/jorts', slugFoto: 'jort-camo-brown' },
  { label: 'Regular Tees', href: '/colecciones/regular-tees', slugFoto: 'regular-tee-black' },
  { label: 'Accesorios', href: '/accesorios', slugFoto: 'camo-cap' },
];

export default function CategoriasChips() {
  const { data = [] } = useProducts(0);
  const fotos = useMemo(() => {
    const bySlug = new Map(data.map((p) => [p.slug, p.images?.[0]]));
    return Object.fromEntries(ACCESOS.map((a) => [a.label, bySlug.get(a.slugFoto)]));
  }, [data]);

  return (
    <nav id="atajos" aria-label="Atajos por categoría" className="px-4 pt-6 md:px-6 md:pt-10">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-4 md:px-0 [&::-webkit-scrollbar]:hidden">
        {ACCESOS.map((a) => (
          <li key={a.label} className="shrink-0">
            <FlowHoverButton
              href={a.href}
              className="h-11 gap-2.5 pl-1 pr-4 text-[13px] md:h-14 md:gap-3 md:pl-1.5 md:pr-6 md:text-[15px]"
              icon={
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white md:h-11 md:w-11">
                  {fotos[a.label] && (
                    <Image
                      src={fotos[a.label]!}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover transition-transform duration-500 group-hover/flow:scale-110"
                    />
                  )}
                </span>
              }
            >
              {a.label}
            </FlowHoverButton>
          </li>
        ))}
      </ul>
    </nav>
  );
}
