'use client';

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';

export interface MayoristaCartItem {
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  // Color elegido (productos con atributo Color en Woo). Ausente si el
  // producto no tiene color.
  color?: string;
  quantity: number;
}

// Lo que identifica una línea del pedido: mismo producto, talle y color.
export type MayoristaCartLine = Pick<MayoristaCartItem, 'slug' | 'size' | 'color'>;

export function lineKey(l: MayoristaCartLine): string {
  return `${l.slug}|${l.size}|${l.color ?? ''}`;
}

interface CartState { items: MayoristaCartItem[] }

function matches(i: MayoristaCartItem, l: MayoristaCartLine): boolean {
  return lineKey(i) === lineKey(l);
}

type CartAction =
  | { type: 'ADD'; item: MayoristaCartItem }
  | { type: 'REMOVE'; line: MayoristaCartLine }
  | { type: 'SET_QTY'; line: MayoristaCartLine; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; state: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => matches(i, action.item));
      if (existing) {
        return { items: state.items.map(i => matches(i, action.item) ? { ...i, quantity: i.quantity + action.item.quantity } : i) };
      }
      return { items: [...state.items, action.item] };
    }
    case 'REMOVE':
      return { items: state.items.filter(i => !matches(i, action.line)) };
    case 'SET_QTY':
      return {
        items: state.items
          .map(i => matches(i, action.line) ? { ...i, quantity: action.quantity } : i)
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
  remove: (line: MayoristaCartLine) => void;
  setQty: (line: MayoristaCartLine, quantity: number) => void;
  clear: () => void;
  replace: (items: MayoristaCartItem[]) => void;
  total: number;
  count: number;
  // true una vez que el carrito se leyó de localStorage (antes, items está vacío).
  hydrated: boolean;
}

const MayoristaCartContext = createContext<MayoristaCartContextType | null>(null);

// El carrito se guarda por cuenta: `hy_mayorista_cart:<customerId>`. Antes la
// clave era una sola para todo el navegador y, en una PC compartida (dos
// locales, un vendedor que atiende varias cuentas), el siguiente usuario
// heredaba el pedido del anterior. El id lo deja el login
// (rememberMayoristaUser) y lo borra el logout (forgetMayoristaUser).
const LEGACY_CART_KEY = 'hy_mayorista_cart';
const CART_KEY_PREFIX = 'hy_mayorista_cart:';
const USER_KEY = 'hy_mayorista_uid';

export function cartStorageKey(uid: string | null): string {
  return uid ? `${CART_KEY_PREFIX}${uid}` : LEGACY_CART_KEY;
}

function currentUid(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}

/** Lo llama el login con el customerId. */
export function rememberMayoristaUser(customerId: number | string): void {
  try { localStorage.setItem(USER_KEY, String(customerId)); } catch {}
}

/** Lo llama el logout: olvida la cuenta y borra su carrito del navegador. */
export function forgetMayoristaUser(): void {
  try {
    const uid = localStorage.getItem(USER_KEY);
    localStorage.removeItem(cartStorageKey(uid));
    localStorage.removeItem(LEGACY_CART_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function MayoristaCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [hydrated, setHydrated] = useState(false);
  const [storageKey, setStorageKey] = useState(LEGACY_CART_KEY);

  useEffect(() => {
    const key = cartStorageKey(currentUid());
    setStorageKey(key);
    try {
      let saved = localStorage.getItem(key);
      // Carrito de antes del cambio (clave sin cuenta): pasa a la cuenta de
      // esta sesión una sola vez y se borra de la clave vieja.
      if (!saved && key !== LEGACY_CART_KEY) {
        saved = localStorage.getItem(LEGACY_CART_KEY);
        if (saved) localStorage.removeItem(LEGACY_CART_KEY);
      }
      if (saved) dispatch({ type: 'LOAD', state: JSON.parse(saved) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }
  }, [state, hydrated, storageKey]);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <MayoristaCartContext.Provider value={{
      items: state.items,
      add: (item) => dispatch({ type: 'ADD', item }),
      remove: (line) => dispatch({ type: 'REMOVE', line }),
      setQty: (line, quantity) => dispatch({ type: 'SET_QTY', line, quantity }),
      clear: () => dispatch({ type: 'CLEAR' }),
      replace: (items) => dispatch({ type: 'LOAD', state: { items } }),
      total, count, hydrated,
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
