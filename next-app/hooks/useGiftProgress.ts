'use client';

import { useEffect, useState } from 'react';
import type { CartItem } from '@/context/CartContext';

export interface GiftMilestone {
  id: string;
  name: string;
  amount: number;
  customer_text: string;
  image: string;
  reached: boolean;
}

export interface GiftNextLevel {
  id: string;
  name: string;
  amount: number;
  remaining: number;
  customer_text: string;
}

export interface GiftProgress {
  active: boolean;
  excluded?: boolean;
  eligible_amount?: number;
  max_amount?: number;
  progress_pct?: number;
  milestones?: GiftMilestone[];
  next?: GiftNextLevel | null;
  max_reached?: boolean;
}

// Purchase Gift es 100% informativo del lado del cliente — el plugin de
// WordPress es la única fuente de verdad de qué nivel corresponde de
// verdad (se recalcula server-side al crear la orden). Este hook solo
// pide el progreso para mostrar la barra; nunca decide nada por su cuenta.
export function useGiftProgress(items: CartItem[], discountAmount = 0): GiftProgress | null {
  const [data, setData] = useState<GiftProgress | null>(null);
  const itemsKey = JSON.stringify(items.map(i => [i.id, i.quantity, i.price]));

  useEffect(() => {
    let alive = true;
    const payload = {
      items: items.map(i => ({ slug: i.id, quantity: i.quantity, unit_price: i.price })),
      discount_amount: discountAmount,
    };

    fetch('/api/gift-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(json => { if (alive) setData(json); })
      .catch(() => { if (alive) setData(null); });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, discountAmount]);

  return data;
}
