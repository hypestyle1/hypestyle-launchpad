'use client';

import { useMemo } from "react";
import ProductCard from "./ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { FAITH_DROP_ITEMS } from "@/lib/faith-drop";
import GroupLabel from "./GroupLabel";
import { HOME_GRID, filasCompletas } from "@/lib/home-grid";

// Placeholder mientras el drop no esta cargado en WP — mismo layout que va a
// tener con los productos reales (grilla de Best Sellers: 4 col desktop x 3 filas = 12).
const PLACEHOLDERS = Array.from({ length: 12 }, (_, i) => ({
  name: `Producto ${i + 1}`,
  category: "Próximamente",
  price: 0,
  image: "",
  badge: "New In",
}));

export default function FaithDrop() {
  const { data: allProducts = [] } = useProducts(0);

  const products = useMemo(() => {
    const bySlug = new Map(allProducts.map(p => [p.slug, p]));
    return FAITH_DROP_ITEMS.flatMap(cfg => {
      const p = bySlug.get(cfg.slug);
      if (!p) return [];
      const purchasable = cfg.live || cfg.preSale;
      return [{
        ...p,
        badge: cfg.preSale ? "Pre-Venta" : (cfg.live ? "New In" : "Próximamente"),
        blurred: cfg.blurred,
        // Vidriera hasta el lanzamiento: sin link al producto ni talles/carrito.
        // Pre-venta cuenta como "disponible" (se puede comprar, solo lleva un
        // badge distinto aclarando que no es el lanzamiento definitivo).
        disableLink: !purchasable,
        sizes: purchasable ? p.sizes : undefined,
        stock: purchasable ? p.stock : undefined,
      }];
    });
  }, [allProducts]);

  // Mientras no haya productos reales cargados, mostramos la grilla con placeholders
  // para poder previsualizar el layout del drop antes de subir los productos.
  const items = filasCompletas(products.length > 0 ? products : PLACEHOLDERS);

  return (
    <div>
      <GroupLabel>Faith Is The Real Hype</GroupLabel>

      <div className={HOME_GRID}>
        {items.map((p, i) => (
          <ProductCard key={i} {...p} />
        ))}
      </div>
    </div>
  );
}
