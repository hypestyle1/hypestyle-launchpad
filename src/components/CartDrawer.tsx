import { useCart } from "@/context/CartContext";
import { useLocale } from "@/context/LocaleContext";
import { useNavigate } from "react-router-dom";

const FREE_SHIPPING = 200000;

const suggested = [
  { id: "camo-cap-orange",    name: "Camo Cap Orange",   category: "Accesorio", price: 15000,  image: "product-camo-cap-orange.webp" },
  { id: "baby-come-back",     name: "Baby Come Back",    category: "Tee",       price: 24000,  image: "product-baby-come-back.webp" },
  { id: "buzo-graphite",      name: "Buzo Graphite",     category: "Hoodie",    price: 42000,  image: "product-buzo-graphite.webp" },
  { id: "racing-tee-verde",   name: "Racing Tee Verde",  category: "Tee",       price: 26000,  image: "product-racing-tee-verde.webp" },
];

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, remove, increment, decrement, total, count, add } = useCart();
  const { formatPrice } = useLocale();
  const navigate = useNavigate();

  if (!drawerOpen) return null;

  const remaining = Math.max(FREE_SHIPPING - total, 0);
  const progress = Math.min((total / FREE_SHIPPING) * 100, 100);
  const freeShipping = remaining === 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[150] bg-black/40"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[160] w-full max-w-[420px] bg-white flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <span className="text-[13px] font-semibold uppercase tracking-wider">
            Carrito ({count})
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Barra envío gratis */}
        <div className="px-6 pt-3 pb-2 border-b border-border">
          {freeShipping ? (
            <p className="text-[11px] text-center font-semibold uppercase tracking-[0.12em] text-green-700">
              ¡Conseguiste envío gratis!
            </p>
          ) : (
            <p className="text-[11px] text-center text-muted-foreground">
              Añadí{" "}
              <span className="font-bold text-foreground">
                {formatPrice(remaining)}
              </span>{" "}
              y conseguí{" "}
              <span className="font-bold uppercase text-foreground">envío gratis</span>
            </p>
          )}
          <div className="mt-2 h-[3px] bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-[13px] text-muted-foreground mb-4">Tu carrito está vacío</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[12px] underline text-foreground/50 hover:text-foreground transition-colors"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex gap-4">
                <div className="w-20 h-24 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[5px]">
                  <img src={`/${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Talle: {item.size}</p>
                  <p className="text-[13px] font-semibold mt-1">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => decrement(item.id, item.size)}
                      className="w-6 h-6 border border-border flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                    >
                      −
                    </button>
                    <span className="text-[13px] tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => increment(item.id, item.size)}
                      className="w-6 h-6 border border-border flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                    >
                      +
                    </button>
                    <button
                      onClick={() => remove(item.id, item.size)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Completa el look */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3">Completa el look</p>
              <div className="grid grid-cols-2 gap-3">
                {suggested
                  .filter((s) => !items.find((i) => i.id === s.id))
                  .slice(0, 4)
                  .map((p) => (
                    <div key={p.id}>
                      <div className="aspect-square bg-bg-alt overflow-hidden mb-1.5 rounded-[5px]">
                        <img src={`/${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] font-medium leading-tight truncate">{p.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-muted-foreground">{formatPrice(p.price)}</p>
                        <button
                          onClick={() => add({ id: p.id, name: p.name, price: p.price, image: p.image, size: "U", quantity: 1 })}
                          className="w-5 h-5 rounded-full border border-foreground/30 flex items-center justify-center text-[13px] font-light hover:bg-foreground hover:text-white transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Subtotal</span>
              <span className="text-[14px] font-semibold">{formatPrice(total)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {freeShipping ? (
                <span className="text-green-700 font-semibold">Envío gratis aplicado</span>
              ) : (
                "Envío calculado en el checkout"
              )}
            </p>
            <button
              onClick={() => { setDrawerOpen(false); navigate("/checkout"); }}
              className="w-full bg-bg-dark text-primary-foreground py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px]"
            >
              Iniciar compra
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full text-center text-[12px] text-foreground/40 hover:text-foreground transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
