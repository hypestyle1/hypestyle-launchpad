'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/context/CartContext';
import { giftProgressKey, giftProgressPayload, type GiftProgressOptions } from '@/lib/gift-progress-payload';

export interface GiftMilestone {
  id: string;
  name: string;
  amount: number;
  customer_text: string;
  image: string;
  reached: boolean;
}

export interface GiftProgressResponse {
  active: boolean;
  excluded?: boolean;
  eligible_amount?: number;
  mode?: 'highest' | 'cumulative';
  progress?: { percentage: number; remaining: number; maximum_threshold: number };
  current_level?: { id: string; threshold: number; reached: boolean } | null;
  next_level?: { id: string; threshold: number; remaining: number } | null;
  gift?: {
    public_key: string;
    name: string;
    image: string;
    quantity: number;
    available: boolean;
    alternative_used: boolean;
  } | null;
  milestones?: GiftMilestone[];
  max_reached?: boolean;
  message?: string;
}

/**
 * Trae el progreso/regalo que corresponde al carrito actual y sincroniza
 * automáticamente la línea de regalo dentro de CartContext — sin que el
 * usuario tenga que hacer nada. El regalo real y definitivo se vuelve a
 * calcular server-side al crear la orden (HPG_Gift_Engine::apply_to_order);
 * esto es solo para que el carrito lo muestre en vivo.
 */
export function useGiftProgress(options?: GiftProgressOptions) {
  const { items, setGift, clearGift } = useCart();
  const purchasable = items.filter((i) => !i.isGift);

  // Key de dependencia estable — evita refetch en cada render, solo cuando
  // cambia algo que realmente afecta el cálculo (incluido el descuento de
  // promo, ver lib/gift-progress-payload).
  const depsKey = giftProgressKey(purchasable, options);

  const query = useQuery<GiftProgressResponse>({
    queryKey: ['gift-progress', depsKey],
    queryFn: async () => {
      const res = await fetch('/api/gift-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftProgressPayload(purchasable, options)),
      });
      if (!res.ok) return { active: false };
      return res.json();
    },
    enabled: purchasable.length > 0,
    staleTime: 15_000,
    retry: 1,
  });

  const lastAppliedKey = useRef<string | null>(null);

  useEffect(() => {
    if (purchasable.length === 0) {
      if (lastAppliedKey.current !== null) {
        clearGift();
        lastAppliedKey.current = null;
      }
      return;
    }

    const data = query.data;
    if (!data || !data.active || !data.gift || !data.gift.available) {
      if (lastAppliedKey.current !== null) {
        clearGift();
        lastAppliedKey.current = null;
      }
      return;
    }

    const key = data.gift.public_key;
    if (lastAppliedKey.current === key) return; // ya está aplicado, no reescribir (evita loops).

    setGift({
      id: `purchase-gift:${key}`,
      name: data.gift.name,
      price: 0,
      image: data.gift.image,
      size: 'U',
      quantity: data.gift.quantity || 1,
      isGift: true,
      locked: true,
      giftLevelId: key,
    });
    lastAppliedKey.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, purchasable.length]);

  return query;
}
