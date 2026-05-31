'use client';

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  customization?: { playerName: string; number: string };
}

interface CartState { items: CartItem[] }

type Customization = CartItem['customization'];

// Firma única de una personalización: dos ítems del mismo producto/talle pero con
// distinto dorsal son líneas distintas (no se fusionan ni se editan entre sí).
function custKey(c?: Customization): string {
  return c && (c.playerName || c.number) ? `${c.number}|${c.playerName}` : '';
}
function matches(i: CartItem, id: string, size: string, cust?: Customization): boolean {
  return i.id === id && i.size === size && custKey(i.customization) === custKey(cust);
}
function sameLine(a: CartItem, b: CartItem): boolean {
  return matches(a, b.id, b.size, b.customization);
}
// Key estable para listas de React (incluye la personalización).
export function cartLineKey(i: CartItem): string {
  return `${i.id}-${i.size}-${custKey(i.customization)}`;
}

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'REMOVE'; id: string; size: string; cust?: Customization }
  | { type: 'INCREMENT'; id: string; size: string; cust?: Customization }
  | { type: 'DECREMENT'; id: string; size: string; cust?: Customization }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => sameLine(i, action.item));
      if (existing) {
        return { items: state.items.map(i => sameLine(i, action.item) ? { ...i, quantity: i.quantity + action.item.quantity } : i) };
      }
      return { items: [...state.items, action.item] };
    }
    case 'REMOVE':
      return { items: state.items.filter(i => !matches(i, action.id, action.size, action.cust)) };
    case 'INCREMENT':
      return { items: state.items.map(i => matches(i, action.id, action.size, action.cust) ? { ...i, quantity: i.quantity + 1 } : i) };
    case 'DECREMENT':
      return { items: state.items.map(i => matches(i, action.id, action.size, action.cust) && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i) };
    case 'CLEAR':
      return { items: [] };
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string, size: string, cust?: Customization) => void;
  increment: (id: string, size: string, cust?: Customization) => void;
  decrement: (id: string, size: string, cust?: Customization) => void;
  clear: () => void;
  total: number;
  count: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = 'hy_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    <CartContext.Provider value={{
      items: state.items,
      add: (item) => dispatch({ type: 'ADD', item }),
      remove: (id, size, cust) => dispatch({ type: 'REMOVE', id, size, cust }),
      increment: (id, size, cust) => dispatch({ type: 'INCREMENT', id, size, cust }),
      decrement: (id, size, cust) => dispatch({ type: 'DECREMENT', id, size, cust }),
      clear: () => dispatch({ type: 'CLEAR' }),
      total, count, drawerOpen, setDrawerOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
