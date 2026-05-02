'use client';

import { useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { checkStock } from "@/lib/checkStock";

interface ProductCardProps {
  id?: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string;
  images?: string[];
  href?: string;
  sizes?: string[];
  stock?: Record<string, "ok" | "low" | "out">;
}

export default function ProductCard({
  id, name, category, price, originalPrice, badge, image, images,
  href = "/productos/", sizes, stock,
}: ProductCardProps) {
  const { formatPrice } = useLocale();
  const { add, setDrawerOpen } = useCart();
  const { toggle, has } = useWishlist();
  const [hovered, setHovered] = useState(false);
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [checkingSize, setCheckingSize] = useState<string | null>(null);
  // Sizes found out-of-stock by live check — persisted for this card's lifetime
  const [liveOutSizes, setLiveOutSizes] = useState<Set<string>>(new Set());
  const wishlisted = id ? has(id) : false;

  const hoverImage = images && images.length > 1 ? images[1] : null;

  const handleAddToCart = async (size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id || checkingSize) return;

    setCheckingSize(size);
    const result = await checkStock(id, size);
    setCheckingSize(null);

    if (result === 'out') {
      setLiveOutSizes(prev => new Set([...prev, size]));
      return;
    }

    add({ id, name, price, image, size, quantity: 1 });
    setAddedSize(size);
    setDrawerOpen(true);
    setTimeout(() => setAddedSize(null), 2000);
  };

  const badgeStyle = () => {
    if (!badge) return "";
    if (badge === "New") return "bg-bg-dark text-primary-foreground";
    if (badge === "Best Seller") return "bg-muted-foreground text-primary-foreground";
    if (badge === "Back") return "bg-primary-foreground border border-foreground text-foreground";
    if (badge.startsWith("−")) return "bg-destructive text-destructive-foreground";
    return "bg-bg-dark text-primary-foreground";
  };

  const hasSizes = id && sizes && sizes.length > 0;

  return (
    <a
      href={href}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-bg-alt">
        <img
          src={image ? (image.startsWith('http') ? image : `/${image}`) : ''}
          alt={name}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
            hovered && hoverImage ? "opacity-0" : "opacity-100"
          }`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {hoverImage && (
          <img
            src={hoverImage.startsWith('http') ? hoverImage : `/${hoverImage}`}
            alt={name}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {badge && (
          <span className={`absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${badgeStyle()}`}>
            {badge}
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
      </div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light mb-0.5">{category}</p>
        <p className="text-[13px] font-medium leading-tight">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span suppressHydrationWarning className={`text-[13px] font-semibold ${originalPrice ? "text-destructive" : ""}`}>
            {formatPrice(price)}
          </span>
          {originalPrice && (
            <span suppressHydrationWarning className="text-[12px] text-text-light line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Size selector — visible on hover */}
        {hasSizes && (
          <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 transition-all duration-200 ${
            hovered ? "opacity-100 max-h-12" : "opacity-0 max-h-0 overflow-hidden"
          }`}>
            {addedSize ? (
              <span className="text-[11px] text-foreground/60">✓ {addedSize} agregado</span>
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
                      isOut
                        ? "text-foreground/20 cursor-not-allowed line-through"
                        : isChecking
                        ? "text-foreground/40 cursor-wait"
                        : checkingSize
                        ? "text-foreground/30"
                        : "text-foreground/50 hover:text-foreground"
                    }`}
                  >
                    {isChecking ? (
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : isOut ? size : size}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </a>
  );
}
