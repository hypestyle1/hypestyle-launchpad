'use client';

import { useEffect, useState } from 'react';

// Slug del unico producto con descuento dinamico por gol (LA NUESTRA).
// Compartido entre la ficha de producto y la pagina de personalizacion:
// ambas necesitan el mismo precio final, o el descuento se "pierde" al
// pasar de una a la otra (ver bug del carrito con precio sin descuento).
export const GOAL_DISCOUNT_SLUG = 'la-nuestra-jersey-mundial-26';

export type GoalDiscount = {
  active?: boolean;
  percent?: number;
  goals?: number;
  perGoal?: number;
  isAustriaPromo?: boolean;
  cap?: number;
  remaining?: number;
  unitsLeft?: number;
  expiresAt?: string | null;
};

export function useGoalDiscount(slug: string, initial: GoalDiscount | null = null): GoalDiscount | null {
  const [d, setD] = useState<GoalDiscount | null>(initial);
  useEffect(() => {
    if (slug !== GOAL_DISCOUNT_SLUG) return;
    let alive = true;
    const load = () => fetch('/api/goal-discount').then(r => r.json()).then(j => { if (alive) setD(j); }).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [slug]);
  return d;
}

// Precio final a mostrar (y a usar al agregar al carrito) para un producto que
// puede tener descuento por gol activo. `regularBase` es el precio de lista
// antes de cualquier descuento (product.originalPrice si ya hay uno, si no product.price).
export function getGoalDiscountPrice(
  product: { price: number; originalPrice?: number | null },
  goalDiscount: GoalDiscount | null,
): { displayPrice: number; displayOriginal: number | null | undefined } {
  const regularBase = product.originalPrice || product.price;
  const goalSalePrice = goalDiscount?.active && goalDiscount.percent
    ? Math.round(regularBase * (1 - goalDiscount.percent))
    : null;
  return {
    displayPrice: goalSalePrice ?? product.price,
    displayOriginal: goalSalePrice ? regularBase : product.originalPrice,
  };
}
