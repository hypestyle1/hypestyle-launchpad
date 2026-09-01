'use client';

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  /** Personalización de la línea. `playerName`/`number` es el dorsal del jersey;
   *  `gift` es el destinatario/mensaje/fecha de una gift card. Viaja acá (y no
   *  en un campo aparte) para que remove/increment/decrement, que reciben la
   *  personalización, distingan dos gift cards con distinto destinatario. */
  customization?: {
    playerName: string;
    number: string;
    gift?: { paraEmail?: string; paraNombre?: string; deNombre?: string; mensaje?: string; enviarEl?: string };
  };
  /** Línea de regalo por compra (Purchase Gift) — solo informativo del lado del
   * cliente, nunca se confía en esto server-side. Siempre id=`purchase-gift:<levelId>`,
   * price=0, quantity=1, locked=true. Ver hooks/useGiftProgress.ts. */
  isGift?: boolean;
  locked?: boolean;
  giftLevelId?: string;
}

interface CartState { items: CartItem[] }

type Customization = CartItem['customization'];

// Firma única de una personalización: dos ítems del mismo producto/talle pero con
// distinto dorsal son líneas distintas (no se fusionan ni se editan entre sí).
function custKey(c?: Customization): string {
  if (!c) return '';
  const dorsal = c.playerName || c.number ? `${c.number}|${c.playerName}` : '';
  const g = c.gift;
  const gift = g && (g.paraEmail || g.paraNombre || g.mensaje || g.enviarEl)
    ? `gift:${g.paraEmail ?? ''}|${g.paraNombre ?? ''}|${g.enviarEl ?? ''}|${g.mensaje ?? ''}`
    : '';
  return dorsal + gift;
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
  | { type: 'LOAD'; state: CartState }
  | { type: 'SET_GIFT'; item: CartItem }
  | { type: 'CLEAR_GIFT' };

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
    case 'SET_GIFT': {
      // Solo puede existir UNA línea de regalo a la vez — reemplaza cualquier
      // otra que hubiera (cambio de nivel, cambio de alternativo, etc.) en una
      // sola operación idempotente.
      const withoutGift = state.items.filter(i => !i.isGift);
      return { items: [...withoutGift, action.item] };
    }
    case 'CLEAR_GIFT':
      return { items: state.items.filter(i => !i.isGift) };
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
  /** Reemplaza el carrito entero. Uso: restaurar la copia de seguridad cuando el
   * cliente vuelve a /checkout desde un pago rechazado. Ver lib/cart-recovery.ts. */
  restore: (items: CartItem[]) => void;
  /** Uso exclusivo de useGiftProgress — agrega o reemplaza la única línea de regalo. */
  setGift: (item: CartItem) => void;
  clearGift: () => void;
  /** false hasta que se leyó el carrito de localStorage. Sin esto, cualquier
   * pantalla que dependa de `items.length === 0` parpadea "carrito vacío". */
  hydrated: boolean;
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
  // El regalo no es algo que el cliente "compró" — no cuenta en el badge de cantidad.
  const count = state.items.reduce((sum, i) => sum + (i.isGift ? 0 : i.quantity), 0);

  return (
    <CartContext.Provider value={{
      items: state.items,
      add: (item) => dispatch({ type: 'ADD', item }),
      remove: (id, size, cust) => dispatch({ type: 'REMOVE', id, size, cust }),
      increment: (id, size, cust) => dispatch({ type: 'INCREMENT', id, size, cust }),
      decrement: (id, size, cust) => dispatch({ type: 'DECREMENT', id, size, cust }),
      clear: () => dispatch({ type: 'CLEAR' }),
      restore: (items) => dispatch({ type: 'LOAD', state: { items } }),
      setGift: (item) => dispatch({ type: 'SET_GIFT', item }),
      clearGift: () => dispatch({ type: 'CLEAR_GIFT' }),
      hydrated, total, count, drawerOpen, setDrawerOpen,
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
