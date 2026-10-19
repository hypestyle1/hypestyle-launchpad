'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { leerVistos } from '@/lib/vistos-recientemente';
import TiraProductos from './TiraProductos';

/**
 * Lo último que miró la persona, abajo de la ficha. Quien entra desde un
 * anuncio, mira tres prendas y quiere volver a la segunda, hoy no tiene cómo:
 * esto es ese camino.
 *
 * Los slugs salen de localStorage y los datos del catálogo ya cargado, así que
 * no agrega ni un pedido a la red y nunca muestra un precio viejo.
 */
export default function VistosRecientemente({ slugActual }: { slugActual: string }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const { data: catalogo = [] } = useProducts(0);

  // En un efecto y no en el primer render: en el servidor no hay localStorage
  // y el HTML tiene que ser el mismo de los dos lados.
  useEffect(() => {
    setSlugs(leerVistos().filter((s) => s !== slugActual));
  }, [slugActual]);

  const productos = useMemo(() => {
    const bySlug = new Map(catalogo.map((p) => [p.slug, p]));
    return slugs.map((s) => bySlug.get(s)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [slugs, catalogo]);

  return <TiraProductos titulo="Vistos recientemente" productos={productos} className="pb-20" />;
}
