import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCachedDiscountStatus } from '@/lib/goal-discount';
import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';
import { CUSTOMIZABLE_SLUGS } from '@/lib/customizable';
import PersonalizarClient from './PersonalizarClient';

export const revalidate = 3600;

// Solo existen las rutas que genera generateStaticParams: cualquier otro slug
// devuelve 404 sin llegar a ejecutar la página.
export const dynamicParams = false;

/**
 * El personalizador dibuja el mockup del jersey de Argentina hardcodeado
 * (products/argentina-jersey/preview-*.png), no una prenda genérica. Antes acá
 * se pedían TODOS los slugs del catálogo y se prerenderizaban 109 páginas, así
 * que /personalizar/<cualquier-producto> respondía 200 mostrando el jersey con
 * el nombre y el precio de otra prenda, y el botón agregaba ESE producto al
 * carrito con una personalización de camiseta. Ahora solo existe la ruta de los
 * productos realmente personalizables.
 */
export async function generateStaticParams() {
  return [...CUSTOMIZABLE_SLUGS].map(slug => ({ slug }));
}

// Es una herramienta del flujo de compra, no contenido de búsqueda: la que
// tiene que rankear es la ficha del producto. follow para no cortar el flujo
// hacia el resto del sitio.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function PersonalizarPage({ params }: { params: { slug: string } }) {
  // Redundante con dynamicParams=false, pero deja la garantía en el código y no
  // solo en la config del router: si algún día se habilitan params dinámicos,
  // esto sigue impidiendo que se sirva el personalizador para un slug cualquiera.
  if (!CUSTOMIZABLE_SLUGS.has(params.slug)) notFound();

  const initialGoalDiscount = params.slug === GOAL_DISCOUNT_SLUG
    ? await getCachedDiscountStatus().catch(() => null)
    : null;

  return (
    <Suspense>
      <PersonalizarClient slug={params.slug} initialGoalDiscount={initialGoalDiscount} />
    </Suspense>
  );
}
