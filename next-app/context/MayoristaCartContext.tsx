'use client';

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';

export interface MayoristaCartItem {
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

interface CartState { items: MayoristaCartItem[] }

function matches(i: MayoristaCartItem, slug: string, size: string): boolean {
  return i.slug === slug && i.size === size;
}

type CartAction =
  | { type: 'ADD'; item: MayoristaCartItem }
  | { type: 'REMOVE'; slug: string; size: string }
  | { type: 'SET_QTY'; slug: string; size: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => matches(i, action.item.slug, action.item.size));
      if (existing) {
        return { items: state.items.map(i => matches(i, action.item.slug, action.item.size) ? { ...i, quantity: i.quantity + action.item.quantity } : i) };
      }
      return { items: [...state.items, action.item] };
    }
    case 'REMOVE':
      return { items: state.items.filter(i => !matches(i, action.slug, action.size)) };
    case 'SET_QTY':
      return {
        items: state.items
          .map(i => matches(i, action.slug, action.size) ? { ...i, quantity: action.quantity } : i)
          .filter(i => i.quantity > 0),
      };
    case 'CLEAR':
      return { items: [] };
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

interface MayoristaCartContextType {
  items: MayoristaCartItem[];
  add: (item: MayoristaCartItem) => void;
  remove: (slug: string, size: string) => void;
  setQty: (slug: string, size: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const MayoristaCartContext = createContext<MayoristaCartContextType | null>(null);
const CART_KEY = 'hy_mayorista_cart';

export function MayoristaCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) dispatch({ type: 'LOAD', state: JSON.parse(saved) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <MayoristaCartContext.Provider value={{
      items: state.items,
      add: (item) => dispatch({ type: 'ADD', item }),
      remove: (slug, size) => dispatch({ type: 'REMOVE', slug, size }),
      setQty: (slug, size, quantity) => dispatch({ type: 'SET_QTY', slug, size, quantity }),
      clear: () => dispatch({ type: 'CLEAR' }),
      total, count,
    }}>
      {children}
    </MayoristaCartContext.Provider>
  );
}

export function useMayoristaCart() {
  const ctx = useContext(MayoristaCartContext);
  if (!ctx) throw new Error('useMayoristaCart must be used within MayoristaCartProvider');
  return ctx;
}
