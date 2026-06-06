'use client';

import { useMemo } from "react";
import { useCart, cartLineKey } from "@/context/CartContext";
import { imgSrc } from "@/lib/img";
import { useLocale } from "@/context/LocaleContext";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";

const FREE_SHIPPING = 250000;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, remove, increment, decrement, total, count, add } = useCart();
  const { formatPrice, t } = useLocale();
  const router = useRouter();
  const { data: allProducts = [] } = useProducts(100);
  const suggested = useMemo(
    () => shuffled(allProducts.filter(p => !items.find(i => i.id === p.slug))).slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawerOpen, allProducts.length]
  );

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
            {t('Carrito')} ({count})
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
              {t('¡Conseguiste envío gratis!')}
            </p>
          ) : (
            <p className="text-[11px] text-center text-muted-foreground">
              {t('Añadí')}{" "}
              <span className="font-bold text-foreground">
                {formatPrice(remaining)}
              </span>{" "}
              {t('y conseguí')}{" "}
              <span className="font-bold uppercase text-foreground">{t('envío gratis')}</span>
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
              <p className="text-[13px] text-muted-foreground mb-4">{t('Tu carrito está vacío')}</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[12px] underline text-foreground/50 hover:text-foreground transition-colors"
              >
                {t('Seguir comprando')}
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={cartLineKey(item)} className="flex gap-4">
                <div className="w-20 h-24 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[5px]">
                  <img src={imgSrc(item.image)} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('Talle')}: {item.size}</p>
                  {item.customization && (item.customization.playerName || item.customization.number) && (
                    <p className="text-[11px] text-foreground/70 mt-0.5 font-medium">
                      {t('Dorsal')}: {item.customization.number && `#${item.customization.number}`}{item.customization.playerName && ` ${item.customization.playerName}`}
                    </p>
                  )}
                  <p className="text-[13px] font-semibold mt-1">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => decrement(item.id, item.size, item.customization)}
                      className="w-6 h-6 border border-border flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                    >
                      −
                    </button>
                    <span className="text-[13px] tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => increment(item.id, item.size, item.customization)}
                      className="w-6 h-6 border border-border flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                    >
                      +
                    </button>
                    <button
                      onClick={() => remove(item.id, item.size, item.customization)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      {t('Eliminar')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Completa el look */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3">{t('Completa el look')}</p>
              <div className="grid grid-cols-2 gap-3">
                {suggested.map((p) => (
                    <div key={p.id}>
                      <div className="aspect-square bg-bg-alt overflow-hidden mb-1.5 rounded-[5px]">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <p className="text-[11px] font-medium leading-tight truncate">{p.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-muted-foreground">{formatPrice(p.price)}</p>
                        <button
                          onClick={() => add({ id: p.slug, name: p.name, price: p.price, image: p.image, size: "U", quantity: 1 })}
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
              <span className="text-[13px] text-muted-foreground">{t('Subtotal')}</span>
              <span className="text-[14px] font-semibold">{formatPrice(total)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {freeShipping ? (
                <span className="text-green-700 font-semibold">{t('Envío gratis aplicado')}</span>
              ) : (
                t('Envío calculado en el checkout')
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              🌍 <span className="font-medium text-foreground/60">Worldwide shipping</span> available via DHL Express
            </p>
            <button
              onClick={() => { setDrawerOpen(false); router.push("/checkout"); }}
              className="w-full bg-bg-dark text-primary-foreground py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-bg-dark/85 transition-colors rounded-[10px]"
            >
              {t('Iniciar compra')}
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full text-center text-[12px] text-foreground/40 hover:text-foreground transition-colors"
            >
              {t('Seguir comprando')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
