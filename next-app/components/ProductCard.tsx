'use client';

import { porcentajeDescuento } from '@/lib/descuento';
import { useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { imgSrc } from "@/lib/img";
import { useLocale } from "@/context/LocaleContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { checkStock } from "@/lib/checkStock";
import { COMING_SOON_TAG } from "@/lib/private-access/normalize";
import { gaAddToCart } from "@/lib/ga";
import { fbAddToCart } from "@/lib/fbpixel";
import { getColorwaysForSlug } from "@/lib/product-detail";
import { useCriticalPainted } from "@/hooks/useCriticalPainted";

// La primera foto es siempre el mockup (la destacada de Woo): todo el sitio
// está armado alrededor de eso. Al pasar el mouse aparece la primera foto de
// la galería, que tiene que ser alguien usando el producto — eso se cuida en
// Woo, no acá. Se probó invertirlo (modelo primero, estilo EME) y se descartó.
//
// El mockup va con object-top (es cuadrado, no se recorta) y la foto del hover
// con object-center: son verticales (3:4, 9:16) y la card es cuadrada, así que
// anclarlas arriba dejaba la cara ocupando el cuadro y la estampa cortada abajo.
// Centrado, la prenda entra entera — revisado contra las 16 fotos del drop Faith.

interface ProductCardProps {
  id?: string;
  name: string;
  category: string;
  price: number;
  /** Solo presentación: el carrito y los eventos conservan price real. */
  pricePresentation?: { price: number; originalPrice: number };
  originalPrice?: number;
  badge?: string;
  image: string;
  images?: string[];
  href?: string;
  sizes?: string[];
  stock?: Record<string, "ok" | "low" | "out">;
  giftNote?: string;
  customizable?: boolean;
  /** Muestra el precio promocional en negro (no en rojo). Usado en New In. */
  mutedPrice?: boolean;
  /**
   * Card compacta para grillas densas (3 columnas en mobile, Best sellers):
   * badge, nombre y precios bajan un escalón para no pisarse en ~115px de
   * ancho. No cambia nada del comportamiento.
   */
  dense?: boolean;
  /** Foto borrosa — para productos recien subidos sin reveal final todavia. */
  blurred?: boolean;
  /** Solo vidriera: sin link al producto ni selector de talle/agregar al carrito. Usado en drops pre-lanzamiento. */
  disableLink?: boolean;
  /**
   * Chequeo de stock en vivo del "agregar" rápido. Por defecto el del catálogo
   * público (GraphQL). Private Access pasa el de su ruta privada: el GraphQL
   * público no ve los productos privados. No cambia nada visual.
   */
  checkStockFn?: (id: string, size: string) => Promise<'ok' | 'low' | 'out'>;
  /** Se llama después de agregar al carrito (Private Access: sus eventos). */
  onAddedToCart?: (args: { id: string; size: string; price: number }) => void;
  /**
   * Tags de Woo (llegan solos al hacer {...producto} desde el catálogo). Con
   * `proximamente` la card linkea a la ficha pero no tiene agregar rápido y
   * lleva el badge "Próximamente".
   */
  tags?: string[];
  /**
   * Qué foto manda en la card: 'mockup' (la destacada de Woo, como siempre) o
   * 'modelo' (la segunda de la galería, alguien usando la prenda). Lo elige el
   * visitante con el selector de vista del catálogo; si el producto no tiene
   * segunda foto, se queda con el mockup. El hover muestra la otra.
   */
  vistaFoto?: 'mockup' | 'modelo';
  /**
   * Monta la foto recién cuando la card está a esta distancia de la pantalla
   * (ej. "400px"). Sin esto, el lazy loading nativo de Chrome en conexiones
   * lentas empieza a bajar todas las cards hasta ~2.500 px más abajo, y en
   * /colecciones/ss27 esas ~30 fotos le sacaban banda a la del hero (el LCP):
   * medido en producción, 8,4 s con la grilla compitiendo, ~5 s sin ella.
   * Es el margen solo hasta que se pinta el hero (useCriticalPainted): después
   * se amplía a PRECARGA_TRAS_HERO, para que un scroll rápido no encuentre
   * cards vacías.
   */
  mountMargin?: string;
  /**
   * Prioridad de la foto principal en las cards de la primera fila de un
   * listado. 'lcp': la que suele ser el LCP (precarga y fetchpriority alta).
   * 'eager': visible al cargar, sin lazy. Sin esto, lazy como siempre. Usarlo
   * en 2 a 4 cards como mucho: priorizar muchas le saca banda a la que importa.
   */
  imagePriority?: 'lcp' | 'eager';
}

/** Margen de precarga de las cards con mountMargin una vez pintado el hero. */
const PRECARGA_TRAS_HERO = "2000px";

export default function ProductCard({
  id, name, category, price, originalPrice, badge: badgeProp, image, images,
  href = "/productos", sizes, stock, giftNote, customizable, mutedPrice,
  dense, blurred, disableLink, checkStockFn = checkStock, onAddedToCart, tags, mountMargin, imagePriority,
  vistaFoto = 'mockup', pricePresentation,
}: ProductCardProps) {
  // Escalas de la card densa vs. la normal (ver prop `dense`).
  const badgePos = dense ? "top-2 left-2 px-1.5 py-0.5 text-[8px] tracking-[0.06em]" : "top-3 left-3 px-2.5 py-1 text-[10px] tracking-wider";
  const nameCls = dense ? "text-[11px]" : "text-[13px]";
  const priceCls = dense ? "text-[11.5px]" : "text-[13px]";
  const strikeCls = dense ? "text-[10px]" : "text-[12px]";
  const comingSoon = !!tags?.includes(COMING_SOON_TAG);
  const badge = comingSoon ? 'Próximamente' : badgeProp;

  // Misma cuenta que la ficha (lib/descuento.ts): si cada una hiciera la suya,
  // el mismo producto podría mostrar −25% en la grilla y −26% al entrar.
  const shownPrice = pricePresentation?.price ?? price;
  const shownOriginal = pricePresentation?.originalPrice ?? originalPrice;
  const descuentoPct = porcentajeDescuento(shownPrice, shownOriginal);
  const { formatPrice, t } = useLocale();
  const { add, setDrawerOpen } = useCart();
  const { toggle, has } = useWishlist();
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [near, setNear] = useState(!mountMargin);
  const heroPintado = useCriticalPainted();
  // Con mountMargin, mientras llega la foto se ve la misma foto en miniatura
  // (24 px, ~1 KB) desenfocada: la card nunca queda vacía en un scroll rápido,
  // y las ~30 miniaturas casi no le sacan banda al hero.
  const [fotoLista, setFotoLista] = useState(false);
  // Foto de modelo = la primera de la galería (la del hover de siempre). Con
  // vista 'modelo' pasa al frente y el mockup queda para el hover; sin segunda
  // foto no hay nada que intercambiar y manda el mockup.
  const fotoModelo = images && images.length > 1 ? images[1] : null;
  const verModelo = vistaFoto === 'modelo' && !!fotoModelo;
  const fotoPrincipal = verModelo ? fotoModelo : image;
  const miniatura = mountMargin && fotoPrincipal
    ? getImageProps({ src: imgSrc(fotoPrincipal), alt: "", width: 24, height: 24, quality: 40 }).props.src
    : null;
  useEffect(() => {
    if (near || !cardRef.current) return;
    const margen = heroPintado ? PRECARGA_TRAS_HERO : mountMargin;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: `${margen} 0px` });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [near, mountMargin, heroPintado]);
  // La foto de hover se monta recién la primera vez que el mouse entra en la
  // card. Antes se pedía siempre (con opacity-0), también en celulares, donde no
  // hay hover: en /colecciones/ss27 eran ~22 imágenes de más compitiendo con el
  // hero. Y la principal se apaga solo cuando la de hover ya cargó.
  const [hoverReady, setHoverReady] = useState(false);
  const [hoverLoaded, setHoverLoaded] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [checkingSize, setCheckingSize] = useState<string | null>(null);
  // Sizes found out-of-stock by live check — persisted for this card's lifetime
  const [liveOutSizes, setLiveOutSizes] = useState<Set<string>>(new Set());
  const wishlisted = id ? has(id) : false;

  const hoverImage = verModelo ? (image ?? null) : fotoModelo;
  const colorways = id ? getColorwaysForSlug(id) : null;

  const handleAddToCart = async (size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id || checkingSize) return;

    setCheckingSize(size);
    const result = await checkStockFn(id, size);
    setCheckingSize(null);

    if (result === 'out') {
      setLiveOutSizes(prev => new Set([...prev, size]));
      return;
    }

    add({ id, name, price, image, size, quantity: 1 });
    fbAddToCart({ id, name, price, quantity: 1 });
    gaAddToCart({ item_id: id, item_name: name, item_category: category, item_variant: size, price, quantity: 1 });
    onAddedToCart?.({ id, size, price });
    setAddedSize(size);
    setDrawerOpen(true);
    setTimeout(() => setAddedSize(null), 2000);
  };

  const badgeStyle = () => {
    if (!badge) return "";
    if (badge === "New In") return "bg-white text-foreground rounded-[4px] shadow-sm";
    if (badge === "Próximamente") return "bg-black/70 backdrop-blur-md text-white rounded-[6px]";
    if (badge === "Pre-Venta") return "bg-amber-500 text-black rounded-[6px]";
    if (badge === "New") return "bg-bg-dark text-primary-foreground";
    if (badge === "Best Seller") return "bg-muted-foreground text-primary-foreground";
    if (badge === "Back") return "bg-white text-foreground rounded-[4px] shadow-sm";
    if (badge.startsWith("−")) return "bg-sale text-sale-foreground rounded-[6px] font-bold";
    return "bg-bg-dark text-primary-foreground";
  };

  const hasSizes = !disableLink && !comingSoon && id && sizes && sizes.length > 0;
  // Producto totalmente agotado: todos los talles sin stock.
  const outOfStock = !!sizes && sizes.length > 0 && !!stock && sizes.every(s => stock[s] === "out");

  // Sin link (vidriera de un drop que todavía no se vende) la card es un
  // <div>: un <a> sin href no es un link para Google ni para un lector de
  // pantalla, y Lighthouse lo marca como enlace no rastreable.
  const Card = (disableLink ? 'div' : 'a') as 'a';

  return (
    <Card
      ref={cardRef}
      {...(disableLink ? {} : { href })}
      className={`group block ${disableLink ? "cursor-default" : ""}`}
      onMouseEnter={() => { setHovered(true); setHoverReady(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-[4px] bg-bg-alt">
        {miniatura && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-cover bg-top scale-110 blur-md transition-opacity duration-500 ${fotoLista ? "opacity-0" : "opacity-100"}`}
            style={{ backgroundImage: `url(${miniatura})` }}
          />
        )}
        {fotoPrincipal && near ? (
          <Image
            src={imgSrc(fotoPrincipal)}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            priority={imagePriority === 'lcp'}
            loading={imagePriority === 'eager' ? 'eager' : undefined}
            onLoad={() => setFotoLista(true)}
            className={`object-cover ${verModelo ? "object-center" : "object-top"} transition-all duration-500 ${blurred ? "blur-lg scale-110" : ""} ${
              (hovered && hoverImage && hoverLoaded) || (miniatura && !fotoLista) ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : null}
        {hoverImage && hoverReady && (
          <Image
            src={imgSrc(hoverImage)}
            alt=""
            fill
            onLoad={() => setHoverLoaded(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover ${verModelo ? "object-top" : "object-center"} transition-all duration-500 ${blurred ? "blur-lg scale-110" : ""} ${
              hovered && hoverLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {outOfStock ? (
          <span className={`absolute ${badgePos} z-10 font-semibold uppercase rounded-[4px] bg-foreground text-background`}>
            {t('Sin stock')}
          </span>
        ) : badge ? (
          <span className={`absolute ${badgePos} z-10 font-semibold uppercase ${badgeStyle()}`}>
            {badge}
          </span>
        ) : null}

        {/* Píldora de descuento. El % sale SIEMPRE de los dos precios reales de
            Woo (`regular_price` y `sale_price`); no hay nada por producto en el
            código. Va redondeada hacia ABAJO a propósito: con un precio
            terminado en $900 el descuento real cae entre dos escalones, y es
            preferible declarar de menos que prometer de más. Debajo de 5% no se
            muestra: un "-3%" no es una oferta, es ruido.
            Arriba a la DERECHA para no pisar el badge "New In"/"Próximamente",
            y fuera del centro para no tapar la prenda. */}
        {descuentoPct !== null && !outOfStock && !mutedPrice && (
          <span
            className={`absolute ${dense ? 'top-2 right-2 px-1.5 py-0.5 text-[9px]' : 'top-3 right-3 px-2 py-1 text-[11px]'} z-10 rounded-[6px] bg-destructive font-bold tabular-nums tracking-[0.02em] text-white shadow-sm`}
          >
            −{descuentoPct}%
          </span>
        )}

        {/* Wishlist heart */}
        {id && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
            aria-label={wishlisted ? "Quitar de favoritos" : "Guardar"}
            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center transition-opacity"
          >
            <svg
              width="17" height="17" viewBox="0 0 24 24"
              fill={wishlisted ? "currentColor" : "none"}
              stroke="currentColor" strokeWidth="1.6"
              className={`transition-colors drop-shadow-sm ${wishlisted ? "text-foreground" : "text-white"}`}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}

        {customizable && (
          <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] bg-foreground/90 text-background backdrop-blur-sm rounded-[4px]">
            {t('Personalizable')}
          </span>
        )}
      </div>

      {/* Info */}
      <div className={dense ? "mt-2 px-0.5" : "mt-3 px-0.5"}>
        <p className={`${nameCls} leading-tight`}>{name}</p>
        <div className={`flex items-center flex-wrap ${dense ? "gap-1" : "gap-2"} mt-1`}>
          {/* Sin stock: ocultamos el precio promocional y mostramos el regular en neutro */}
          <span suppressHydrationWarning className={`${priceCls} font-semibold whitespace-nowrap ${originalPrice && !outOfStock && !mutedPrice ? "text-destructive" : ""}`}>
            {formatPrice(outOfStock && shownOriginal ? shownOriginal : shownPrice)}
          </span>
          {shownOriginal && !outOfStock && (
            <span suppressHydrationWarning className={`${strikeCls} text-text-light line-through whitespace-nowrap`}>
              {formatPrice(shownOriginal)}
            </span>
          )}
        </div>

        {colorways && colorways.length > 1 && (
          <div className="flex items-center gap-1.5 mt-1.5" aria-label={`${colorways.length} colores`}>
            {colorways.slice(0, 4).map((c) => (
              <span
                key={c.slug}
                title={c.label}
                className={`w-[11px] h-[11px] rounded-full border ${c.slug === id ? "ring-1 ring-foreground ring-offset-1 border-transparent" : "border-black/15"}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            {colorways.length > 4 && <span className="text-[11px] text-foreground/60">+{colorways.length - 4}</span>}
          </div>
        )}

        {giftNote && (
          <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wide bg-green-600/10 text-green-700 px-2 py-0.5 rounded-[4px]">
            {giftNote}
          </span>
        )}

        {/* Size selector — visible on hover */}
        {hasSizes && (
          <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 transition-all duration-200 ${
            hovered ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden"
          }`}>
            {addedSize ? (
              <span className="text-[11px] text-foreground/60">{t('✓ agregado')}</span>
            ) : sizes!.length === 1 ? (
              /* Talle único — botón directo sin mostrar el nombre del talle */
              (() => {
                const size = sizes![0];
                const isOut = stock?.[size] === "out" || liveOutSizes.has(size);
                const isChecking = checkingSize === size;
                return (
                  <button
                    onClick={(e) => !isOut && !isChecking && handleAddToCart(size, e)}
                    disabled={isOut || !!checkingSize}
                    className={`text-[11px] uppercase tracking-wide transition-colors ${
                      isOut ? "text-foreground/20 cursor-not-allowed" :
                      isChecking ? "text-foreground/40 cursor-wait" :
                      "text-foreground/50 hover:text-foreground"
                    }`}
                  >
                    {isChecking ? (
                      <svg className="animate-spin w-3 h-3 inline" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : isOut ? t('Sin stock') : t('Agregar')}
                  </button>
                );
              })()
            ) : (
              sizes!.map((size) => {
                const isOut = stock?.[size] === "out" || liveOutSizes.has(size);
                const isChecking = checkingSize === size;
                return (
                  <button
                    key={size}
                    onClick={(e) => !isOut && !isChecking && handleAddToCart(size, e)}
                    disabled={isOut || !!checkingSize}
                    className={`text-[11px] uppercase tracking-wide transition-colors min-w-[16px] flex items-center justify-center ${
                      isOut ? "text-foreground/20 cursor-not-allowed line-through" :
                      isChecking ? "text-foreground/40 cursor-wait" :
                      checkingSize ? "text-foreground/30" :
                      "text-foreground/50 hover:text-foreground"
                    }`}
                  >
                    {isChecking ? (
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : size}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
