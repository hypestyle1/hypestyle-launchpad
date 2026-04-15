interface ProductCardProps {
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string;
}

export default function ProductCard({ name, category, price, originalPrice, badge, image }: ProductCardProps) {
  const badgeStyle = () => {
    if (!badge) return "";
    if (badge === "New") return "bg-bg-dark text-primary-foreground";
    if (badge === "Best Seller") return "bg-muted-foreground text-primary-foreground";
    if (badge === "Back") return "bg-primary-foreground border border-foreground text-foreground";
    if (badge.startsWith("−")) return "bg-destructive text-destructive-foreground";
    return "bg-bg-dark text-primary-foreground";
  };

  return (
    <div className="group">
      {/* Image container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-alt">
        <img
          src={`/${image}`}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {badge && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${badgeStyle()}`}>
            {badge}
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <button className="w-full py-2.5 bg-bg-dark text-primary-foreground text-[12px] font-semibold uppercase tracking-wider hover:bg-bg-dark2 transition-colors">
            Ver producto →
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-text-light mb-0.5">{category}</p>
        <p className="text-[13px] font-medium leading-tight">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[13px] font-semibold ${originalPrice ? "text-destructive" : ""}`}>
            ${price.toLocaleString("es-AR")}
          </span>
          {originalPrice && (
            <span className="text-[12px] text-text-light line-through">
              ${originalPrice.toLocaleString("es-AR")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
