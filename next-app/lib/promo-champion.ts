// 50% OFF en todo el catálogo si Argentina sale campeón del mundo (Mundial 26', final).
// Excluye LA NUESTRA (GOAL_DISCOUNT_SLUG), que sigue su propia lógica de descuento por
// gol (lib/goal-discount.ts, escrita directo en el sale_price de WooCommerce).
// Mismo mecanismo que el 3x2 (lib/promo-3x2.ts): fee line calculada en el cliente y
// re-validada/recortada server-side en create-order antes de mandarla a WooCommerce.

import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';

export const PROMO_CHAMPION_PERCENT = 0.5;

export interface PromoChampionLine {
  id: string; // slug del producto, mismo campo que CartItem.id
  price: number;
  quantity: number;
}

function eligibleTotal(lines: PromoChampionLine[]): number {
  return lines
    .filter(l => l.id !== GOAL_DISCOUNT_SLUG)
    .reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function computeChampionDiscount(lines: PromoChampionLine[]): number {
  return Math.round(eligibleTotal(lines) * PROMO_CHAMPION_PERCENT);
}
