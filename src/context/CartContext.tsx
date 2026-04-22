import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  customization?: { playerName: string; number: string };
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string; size: string }
  | { type: "INCREMENT"; id: string; size: string }
  | { type: "DECREMENT"; id: string; size: string }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find(
        (i) => i.id === action.item.id && i.size === action.item.size
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id && i.size === action.item.size
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE":
      return {
        items: state.items.filter(
          (i) => !(i.id === action.id && i.size === action.size)
        ),
      };
    case "INCREMENT":
      return {
        items: state.items.map((i) =>
          i.id === action.id && i.size === action.size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      };
    case "DECREMENT":
      return {
        items: state.items.map((i) =>
          i.id === action.id && i.size === action.size && i.quantity > 1
            ? { ...i, quantity: i.quantity - 1 }
            : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string, size: string) => void;
  increment: (id: string, size: string) => void;
  decrement: (id: string, size: string) => void;
  clear: () => void;
  total: number;
  count: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "hy_cart";

function loadCart(): CartState {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : { items: [] };
  } catch {
    return { items: [] };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        add: (item) => dispatch({ type: "ADD", item }),
        remove: (id, size) => dispatch({ type: "REMOVE", id, size }),
        increment: (id, size) => dispatch({ type: "INCREMENT", id, size }),
        decrement: (id, size) => dispatch({ type: "DECREMENT", id, size }),
        clear: () => dispatch({ type: "CLEAR" }),
        total,
        count,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
