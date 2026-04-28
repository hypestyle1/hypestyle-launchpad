'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const drops = [
  {
    name: "No Love, Only Style",
    season: "Drop 01 — 2025",
    description: "El primer drop de la era. Gráficos crudos, actitud sin filtro.",
    image: "No Love, Only Style banner.webp",
    href: "/no-love-only-style/",
    products: 6,
    status: "disponible",
  },
  {
    name: "Camo Set Drop",
    season: "Drop 02 — 2025",
    description: "Set completo en camo full print. Cargo fit, entretela polar, cremera YKK.",
    image: "stl-look-camo-outdoor.png",
    href: "/camo-set-drop/",
    products: 4,
    status: "disponible",
  },
  {
    name: "Race Drop",
    season: "Drop 03 — 2025",
    description: "No service for the faithless. Race Tee, Hoodie y accesorios de edición limitada.",
    image: "race drop banner.webp",
    href: "/race/",
    products: 4,
    status: "disponible",
  },
  {
    name: "Summer 26",
    season: "Drop 04 — 2026",
    description: "Mesh, fileteado y Jorts para el verano. La temporada más caliente.",
    image: "summer drop banner.webp",
    href: "/summer-26/",
    products: 4,
    status: "próximamente",
  },
  {
    name: "Regular Tees",
    season: "Colección permanente",
    description: "Básicos que no son básicos. 100% algodón, corte perfecto, siempre disponible.",
    image: "regular tee 1.webp",
    href: "/regular-tees/",
    products: 8,
    status: "disponible",
  },
];

const categorias = [
  { name: "Arriba",     image: "regular tee 1.webp",   href: "/arriba/" },
  { name: "Hoodies",    image: "cat-hoodies.webp",      href: "/hoodies/" },
  { name: "Abajo",      image: "cat-sets.webp",         href: "/abajo/" },
  { name: "Accesorios", image: "cat-accesorios.webp",   href: "/accesorios/" },
];

export default function Colecciones() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)]">

        {/* ── Header ── */}
        <div className="max-w-[1400px] mx-auto px-4 pt-10 pb-8 border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Hypestyle</p>
          <h1 className="text-[32px] md:text-[48px] font-bold uppercase tracking-tight leading-none">
            Colecciones
          </h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-md">
            Cada drop es una declaración. Producción limitada, stock que no se repite.
          </p>
        </div>

        {/* ── Drops ── */}
        <div className="max-w-[1400px] mx-auto px-4 pt-10 pb-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6">Drops</p>
          <div className="space-y-[2px]">
            {drops.map((drop, i) => (
              <a
                key={drop.name}
                href={drop.href}
                className="group flex flex-col md:flex-row gap-[2px] overflow-hidden"
              >
                {/* Imagen */}
                <div
                  className={`relative overflow-hidden bg-bg-alt flex-shrink-0 w-full md:w-[420px] lg:w-[520px] ${
                    i % 2 === 0 ? "md:order-1" : "md:order-2"
                  }`}
                  style={{ aspectRatio: "4/3" }}
                >
                  <img
                    src={`/${drop.image}`}
                    alt={drop.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                  <span className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 ${
                    drop.status === "disponible"
                      ? "bg-foreground text-background"
                      : "bg-background/80 text-foreground backdrop-blur-sm border border-border"
                  }`}>
                    {drop.status}
                  </span>
                </div>

                {/* Info */}
                <div className={`flex-1 bg-bg-alt flex flex-col justify-between p-8 md:p-12 ${
                  i % 2 === 0 ? "md:order-2" : "md:order-1"
                }`}>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                      {drop.season}
                    </p>
                    <h2 className="text-[28px] md:text-[36px] font-bold uppercase tracking-tight leading-tight mb-4">
                      {drop.name}
                    </h2>
                    <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm">
                      {drop.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-8">
                    <p className="text-[12px] text-muted-foreground">{drop.products} productos</p>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      Ver colección
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Divisor ── */}
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="flex items-center gap-6">
            <div className="flex-1 h-px bg-border" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex-shrink-0">
              Shop por categoría
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* ── Categorías ── */}
        <div className="max-w-[1400px] mx-auto px-4 pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[2px]">
            {categorias.map((cat) => (
              <a
                key={cat.name}
                href={cat.href}
                className="group relative overflow-hidden bg-bg-alt"
                style={{ aspectRatio: "3/4" }}
              >
                <img
                  src={`/${cat.image}`}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent group-hover:from-bg-dark/90 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 p-5">
                  <p className="text-primary-foreground text-lg font-bold uppercase tracking-tight">
                    {cat.name}
                  </p>
                  <p className="text-primary-foreground/60 text-[12px] font-medium uppercase tracking-wider mt-1 transition-all duration-300 group-hover:text-primary-foreground/90">
                    Shop →
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
