'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, cartLineKey } from "@/context/CartContext";
import { imgSrc } from "@/lib/img";
import { useLocale } from "@/context/LocaleContext";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { compute3x2Discount, unitsToNext3x2 } from "@/lib/promo-3x2";
import { usePromo3x2Status } from "@/hooks/usePromo3x2Status";
import GiftProgressBar from "@/components/GiftProgressBar";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/envio";
import { ScrollFadeList } from "@/components/ui/scroll-fade-list";
import { Button } from "@/components/ui/button";
import { suggestForCart } from "@/lib/cart-suggestions";

// Mismo 10% que aplica el checkout al pagar por transferencia.
const TRANSFER_RATE = 10;
const CUOTAS = 3;

// Tiempos de la animación. Los de salida tienen que cubrir las transiciones de
// globals.css (420 ms el panel y la fila).
const EXIT_MS = 440;
const LINE_EXIT_MS = 430;
const STAGGER_BASE_MS = 380;
const STAGGER_STEP_MS = 90;
const STAGGER_MAX = 8;

// Mismo vidrio que el navbar (Navbar.tsx), un poco más transparente para que
// el fondo se note en un panel de este tamaño. A cambio el texto secundario va
// más oscuro que en el resto del sitio, así se lee sobre cualquier fondo. La
// tarjeta del regalo por compra se vuelve translúcida para no tapar el efecto.
const drawerGlassStyle = {
  background: 'rgba(240, 238, 232, 0.55)',
  '--muted-foreground': '0 0% 26%',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  borderLeft: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.6)',
  '--hpg-card-bg': 'hsl(142 45% 96% / 0.5)',
  '--hpg-card-border': 'hsl(142 30% 60% / 0.35)',
} as React.CSSProperties;

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, remove, increment, decrement, total, count, add } = useCart();
  const { formatPrice, currency, t } = useLocale();
  const router = useRouter();
  const { data: allProducts = [] } = useProducts(0);
  // Se recalcula al abrir y cuando cambia qué hay en el carrito (no la
  // cantidad): si sumás el hoodie, lo siguiente que se ofrece ya es otra cosa.
  const cartKey = items.map(i => i.id).join('|');
  // Al cerrar se conserva lo último que se mostró: el panel sigue a la vista
  // mientras sale y no tiene que cambiar de contenido en el camino.
  const lastSuggested = useRef<ReturnType<typeof suggestForCart>>([]);
  const suggested = useMemo(
    () => {
      if (drawerOpen) lastSuggested.current = suggestForCart(items, allProducts, 4);
      return lastSuggested.current;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawerOpen, allProducts.length, cartKey]
  );
  const [suggestedSizes, setSuggestedSizes] = useState<Record<string, string>>({});

  const { promoActive: promo3x2Active } = usePromo3x2Status();

  // La animación (globals.css, "Drawer del carrito") necesita dos cosas que un
  // `return null` no da: que el panel exista un cuadro antes de abrirse, para
  // que la entrada tenga desde dónde arrancar, y que siga existiendo mientras
  // sale. `rendered` es si está en el DOM; `open`, si está a la vista.
  const [rendered, setRendered] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  // Las filas que ya estaban al abrir entran escalonadas; las que se suman con
  // el drawer abierto entran en el acto. El retraso de cada fila queda fijo
  // desde que aparece: cambiarlo con la animación en curso la haría saltar.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const openedWith = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!drawerOpen) {
      setOpen(false);
      const out = setTimeout(() => { setRendered(false); setLeaving(new Set()); }, EXIT_MS);
      return () => clearTimeout(out);
    }
    openedWith.current = new Map(itemsRef.current.map((item, i) => [cartLineKey(item), i]));
    setRendered(true);
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setOpen(true)); });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!rendered) return null;

  // Retraso de entrada de cada bloque, de arriba hacia abajo.
  const stagger = (i: number) => ({
    '--d': `${STAGGER_BASE_MS + Math.min(i, STAGGER_MAX) * STAGGER_STEP_MS}ms`,
  }) as React.CSSProperties;
  const lineStagger = (key: string) => {
    const i = openedWith.current.get(key);
    return i === undefined ? ({ '--d': '0ms' } as React.CSSProperties) : stagger(3 + i);
  };

  // Eliminar espera a que la fila termine de salir.
  const removeLine = (item: (typeof items)[number]) => {
    const key = cartLineKey(item);
    setLeaving(prev => new Set(prev).add(key));
    setTimeout(() => {
      remove(item.id, item.size, item.customization);
      setLeaving(prev => { const next = new Set(prev); next.delete(key); return next; });
    }, LINE_EXIT_MS);
  };

  // El regalo por compra no es un producto pago: no cuenta para el 3x2.
  const purchasableItems = items.filter(item => !item.isGift);

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - total, 0);
  const progress = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const freeShipping = remaining === 0;

  const promo3x2Discount = promo3x2Active ? compute3x2Discount(purchasableItems) : 0;
  const promo3x2Faltan = promo3x2Active ? unitsToNext3x2(purchasableItems) : 0;

  // Formas de pago, con las mismas cuentas que el checkout: el 10% de
  // transferencia va sobre lo físico (la gift card se paga entera) y después
  // del 3x2. El envío se suma recién en el checkout.
  const giftCardSubtotal = items
    .filter(item => item.id === 'gift-card')
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const payable = Math.max(total - promo3x2Discount, 0);
  const physical = Math.max(payable - giftCardSubtotal, 0);
  const transferTotal = Math.round(physical * (1 - TRANSFER_RATE / 100)) + giftCardSubtotal;
  const showPayments = currency === 'ARS' && payable > 0;

  return (
    <>
      {/* Overlay. Termina donde empieza el drawer: si lo oscureciera por detrás,
          el vidrio desenfocaría una imagen ya apagada y quedaría gris. */}
      <div
        className="hs-drawer-overlay fixed inset-0 min-[420px]:right-[420px] z-[150] bg-black/40"
        data-open={open}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <div
        className="hs-drawer fixed right-0 top-0 bottom-0 z-[160] w-full max-w-[420px] flex flex-col"
        data-open={open}
        style={drawerGlassStyle}
      >

        {/* Header */}
        <div className="hs-drawer-in flex items-center justify-between px-6 py-5 border-b border-black/10" style={stagger(0)}>
          <span className="text-[13px] font-semibold uppercase tracking-wider">
            {t('Carrito')} (<span key={count} className="hs-tick">{count}</span>)
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
        <div className="hs-drawer-in px-6 pt-3 pb-2 border-b border-black/10" style={stagger(1)}>
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

        {/* Barra regalo por compra */}
        {items.length > 0 && (
          <div className="hs-drawer-in" style={stagger(2)}>
            <GiftProgressBar className="px-6 pt-2 pb-2 border-b border-black/10" />
          </div>
        )}

        {/* Barra 3x2 */}
        {promo3x2Active && items.length > 0 && (promo3x2Discount > 0 || promo3x2Faltan < 3) && (
          <div className="hs-drawer-in px-6 pt-2 pb-2 border-b border-black/10" style={stagger(2)}>
            {promo3x2Discount > 0 ? (
              <p className="text-[11px] text-center font-semibold uppercase tracking-[0.12em] text-green-700">
                3x2 aplicado — ahorrás {formatPrice(promo3x2Discount)}
              </p>
            ) : (
              <p className="text-[11px] text-center text-muted-foreground">
                {t('Añadí')} <span className="font-bold text-foreground">{promo3x2Faltan}</span>{' '}
                {t('más y llevate el')} <span className="font-bold uppercase text-foreground">3x2</span>
              </p>
            )}
          </div>
        )}

        {/* Items. El scroll se difumina contra los bordes en vez de cortar en
            seco: con 3 o más productos avisa que la lista sigue sin flecha ni
            sombra. El drawer es de vidrio, así que no hay un color de fondo
            contra el cual degradar: se apaga el degradado y el mismo alto se
            usa como máscara sobre la lista. */}
        <ScrollFadeList
          className="flex-1 min-h-0 [--scroll-fade-bg:transparent]"
          scrollClassName="h-full overflow-y-auto overscroll-contain px-6 py-4 space-y-5 [mask-image:linear-gradient(to_bottom,transparent,#000_var(--top-fade-height),#000_calc(100%_-_var(--bottom-fade-height)),transparent)]"
        >
          {items.length === 0 ? (
            <div className="hs-drawer-in flex flex-col items-center justify-center h-full text-center" style={stagger(3)}>
              <p className="text-[13px] text-muted-foreground mb-4">{t('Tu carrito está vacío')}</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-[12px] underline text-foreground/50 hover:text-foreground transition-colors"
              >
                {t('Seguir comprando')}
              </button>
              {/* El carrito vacío es el momento exacto en que alguien no sabe
                  qué llevarse: la gift card resuelve eso. */}
              <a
                href="/gift-cards/"
                onClick={() => setDrawerOpen(false)}
                className="mt-3 text-[12px] text-foreground/50 hover:text-foreground transition-colors"
              >
                {t('o regalá una gift card')}
              </a>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={cartLineKey(item)}
                className={`hs-cart-line ${item.isGift ? '-mx-2' : ''}`}
                data-leaving={leaving.has(cartLineKey(item))}
              >
              <div
                className={`hs-drawer-in flex gap-4 ${item.isGift ? 'bg-green-50/60 border border-green-100 rounded-[8px] p-2' : ''}`}
                style={lineStagger(cartLineKey(item))}
              >
                <div className="w-20 h-24 bg-bg-alt flex-shrink-0 overflow-hidden rounded-[5px]">
                  <img src={imgSrc(item.image)} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                  {!item.isGift && item.id !== 'gift-card' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('Talle')}: {item.size}</p>
                  )}
                  {item.id === 'gift-card' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.customization?.gift?.paraEmail
                        ? `Para ${item.customization.gift.paraNombre || item.customization.gift.paraEmail}${item.customization.gift.enviarEl ? ` · ${item.customization.gift.enviarEl}` : ''}`
                        : 'Digital · te llega por mail'}
                    </p>
                  )}
                  {item.customization && (item.customization.playerName || item.customization.number) && (
                    <p className="text-[11px] text-foreground/70 mt-0.5 font-medium">
                      {t('Dorsal')}: {item.customization.number && `#${item.customization.number}`}{item.customization.playerName && ` ${item.customization.playerName}`}
                    </p>
                  )}
                  <p className="text-[13px] font-semibold mt-1">{formatPrice(item.price)}</p>
                  {item.isGift ? (
                    <p className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[0.1em] text-green-700 border border-green-700/30 rounded-[5px] px-2 py-1">
                      {t('Regalo por compra')}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => decrement(item.id, item.size, item.customization)}
                        className="w-6 h-6 border border-black/10 flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                      >
                        −
                      </button>
                      <span key={item.quantity} className="hs-tick text-[13px] tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => increment(item.id, item.size, item.customization)}
                        className="w-6 h-6 border border-black/10 flex items-center justify-center text-[14px] hover:border-foreground transition-colors rounded-[5px]"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeLine(item)}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
                      >
                        {t('Eliminar')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              </div>
            ))
          )}

          {/* Completa el look */}
          {items.length > 0 && (
            <div className="hs-drawer-in pt-4 border-t border-black/10" style={stagger(3 + items.length)}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3">{t('Completa el look')}</p>
              <div className="grid grid-cols-2 gap-3">
                {suggested.map((p) => {
                  const available = p.sizes.filter(s => p.stock[s] !== 'out');
                  const size = suggestedSizes[p.slug] ?? (available.length === 1 ? available[0] : '');
                  return (
                    <div key={p.id}>
                      <div className="aspect-square bg-bg-alt overflow-hidden mb-1.5 rounded-[5px]">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <p className="text-[11px] font-medium leading-tight truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mb-1">{formatPrice(p.price)}</p>
                      {available.length > 1 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {available.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSuggestedSizes(prev => ({ ...prev, [p.slug]: s }))}
                              className={`text-[9px] font-semibold px-1.5 py-[2px] border rounded-[4px] transition-colors leading-none ${
                                size === s ? 'border-foreground bg-foreground text-white' : 'border-black/10 text-foreground/55 hover:border-foreground/50'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => size && add({ id: p.slug, name: p.name, price: p.price, image: p.image, size, quantity: 1 })}
                        disabled={!size}
                        className="w-full text-[10px] font-semibold uppercase tracking-wide py-1 rounded-[4px] border border-foreground/30 hover:bg-foreground hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                      >
                        {size ? 'Agregar' : 'Elegí talle'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollFadeList>

        {/* Footer */}
        {items.length > 0 && (
          <div className="hs-drawer-in px-6 py-5 border-t border-black/10 space-y-3" style={stagger(5)}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">{t('Subtotal')}</span>
              <span key={total} className="hs-tick text-[14px] font-semibold tabular-nums">{formatPrice(total)}</span>
            </div>
            {promo3x2Discount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-green-700">3x2</span>
                <span className="text-[14px] font-semibold text-green-700">−{formatPrice(promo3x2Discount)}</span>
              </div>
            )}
            {showPayments && (
              <div className="space-y-0.5">
                {physical > 0 && (
                  <p className="text-[12px] text-muted-foreground">
                    {t('O')} <span className="font-semibold text-foreground">{formatPrice(transferTotal)}</span> {t('con Transferencia o depósito bancario')}{' '}
                    <span className="text-green-700 font-semibold">(+{TRANSFER_RATE}% off)</span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {t('O hasta 3 cuotas sin interés de')} {formatPrice(Math.round(payable / CUOTAS))}
                </p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {freeShipping ? (
                <span className="text-green-700 font-semibold">{t('Envío gratis aplicado')}</span>
              ) : (
                t('Envío calculado en el checkout')
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/60">Worldwide shipping</span> available via FedEx
            </p>
            <Button
              variant="hype" size="ctaFull"
              onClick={() => { setDrawerOpen(false); router.push("/checkout"); }}
              className="py-3.5 rounded-[10px]"
            >
              {t('Iniciar compra')}
            </Button>
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
