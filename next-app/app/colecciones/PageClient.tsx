'use client';

import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * Índice de colecciones (rediseño 2026): Temporada actual (SS27, FW26,
 * Esenciales: filas editoriales grandes) y Archivo (cápsulas y colabs pasadas
 * en una grilla sobria y uniforme, lookbooks integrados — acá viven desde que
 * salieron del menú). Tipografía del sistema; los contadores hardcodeados,
 * que estaban desactualizados, no se muestran más.
 */

type Drop = {
  name: string; season: string; description: string; image: string;
  href: string; status: string; cta?: string;
  /** Foto de producto PNG (mockup): va contenida, con aire y sombra suave. */
  mockup?: boolean;
};

const drops: Drop[] = [
  {
    name: "Spring Summer 27 · Part 01",
    season: "Colección — Spring Summer 2027",
    description: "Boxy tees, waffle longsleeves y hoodies lavados. La primera parte de la temporada, en producción limitada.",
    image: "ss27/coleccion/hero-duo-grey-hd.webp",
    href: "/colecciones/ss27/",
    status: "nuevo",
  },
  {
    name: "Fall Winter 26",
    season: "Colección — Fall/Winter 2026",
    description: "Conjuntos HStars, abrigo, polos y las gráficas de Fe. La colección anterior, con precios de cierre.",
    image: "fw26-camo-editorial.webp",
    href: "/colecciones/fw26/",
    status: "disponible",
  },
  {
    name: "Esenciales — Regular Tees",
    season: "Programa permanente",
    description: "Básicos que no son básicos. 100% algodón, corte perfecto, siempre disponible.",
    // El 3-PACK Black/Navy/White: el producto más vendido del programa (la
    // foto anterior era la Honda tee, que no es una básica).
    image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/08/regular-tees-3pack-black-navy-white.png",
    mockup: true,
    href: "/colecciones/regular-tees/",
    status: "disponible",
  },
  {
    name: "Faith Is The Real Hype",
    season: "Drop — Invierno 2026",
    description: "Streetwear con fe. Hoodies y remeras con gráficos religiosos, corte oversize.",
    image: "newin/faith-christ-reigns-hoodie.webp",
    href: "/colecciones/faith-is-the-real-hype/",
    status: "disponible",
  },
  {
    name: "Napoli",
    season: "Drop — Agosto 2026",
    description: "Honor y gloria. Las Napoli Tees en azzurro y bianco, filmadas en el potrero de La Boca.",
    image: "napoli-drop-banner.webp",
    href: "/colecciones/napoli/",
    status: "disponible",
  },
  {
    name: "No Love, Only Style",
    season: "Drop 01 — 2025",
    description: "El primer drop de la era. Gráficos crudos, actitud sin filtro.",
    image: "No Love, Only Style banner.webp",
    href: "/colecciones/no-love-only-style/",
    status: "disponible",
  },
  {
    name: "Summer '26",
    season: "Drop — Verano 2026",
    description: "Mesh, fileteado y Jorts para el verano. La temporada más caliente.",
    image: "summer drop banner.webp",
    href: "/colecciones/summer-26/",
    status: "disponible",
  },
  {
    name: "Camo Set Drop",
    season: "Drop 02 — 2025",
    description: "Set completo en camo full print. Cargo fit, entretela polar, cremera YKK.",
    image: "stl-look-camo-outdoor.webp",
    href: "/colecciones/camo-set-drop/",
    status: "agotado",
  },
  {
    name: "Race Drop",
    season: "Drop 03 — 2025",
    description: "No service for the faithless. Race Tee, Hoodie y accesorios de edición limitada.",
    image: "race drop banner.webp",
    href: "/colecciones/race/",
    status: "disponible",
  },
  {
    name: "Fileteado Porteño x Alfredo Genovese",
    season: "Colab — Diciembre 2025",
    description: "Filete porteño sobre una camiseta de fútbol. El jersey fileteado por Alfredo Genovese, filmado en la cancha de la Villa 31.",
    image: "genovese-drop-banner.webp",
    href: "/lookbook-genovese/",
    status: "disponible",
    cta: "Ver lookbook",
  },
  {
    name: "Lookbook FW26 — Rio de Janeiro",
    season: "Shooting — Mayo 2026",
    description: "La colección FW26 puesta, en Rio de Janeiro. Fotos de Fili.",
    image: "fw26-camo-editorial.webp",
    href: "/lookbook-fw26/",
    status: "disponible",
    cta: "Ver lookbook",
  },
  {
    name: "La Ciudad del Pop x Mir Nicolás",
    season: "Colab — Octubre 2025",
    description: "Arte inspirado en el universo visual de Mir Nicolás y la cultura urbana japonesa. Tres gráficas, con pop-up en Vorterix.",
    image: "mir-nicolas-drop-banner.webp",
    href: "/lookbook-mir/",
    status: "agotado",
    cta: "Ver lookbook",
  },
  {
    name: "CULTO x Neo Pistea",
    season: "Colab — Verano 2025",
    description: "El merch oficial del disco. Tres remeras con Neo Pistea, agotadas: queda el lookbook del shooting.",
    image: "neo-pistea-drop-banner.webp",
    href: "/lookbook-neo/",
    status: "agotado",
    cta: "Ver lookbook",
  },
  {
    name: "Tie Dye Hoodie Drop x Ferpa",
    season: "Colab — Septiembre 2020",
    description: "Cuarenta buzos tie dye, ninguno a la venta: se repartieron entre los streamers y creadores del momento.",
    image: "ferpa-drop-banner.webp",
    href: "/lookbook-ferpa/",
    status: "not for sale",
    cta: "Ver lookbook",
  },
];

// Temporada actual (aprobado 12/10): SS27 · FW26 · Esenciales. El resto es
// Archivo: ninguna URL se elimina, el valor SEO se conserva.
const ACTUALES = new Set(["/colecciones/ss27/", "/colecciones/fw26/", "/colecciones/regular-tees/"]);

/** Las fotos de los drops pueden ser locales (public/) o del WP (URL completa). */
const dropSrc = (image: string) => (image.startsWith('http') ? image : `/${image}`);

export default function Colecciones() {
  const actuales = drops.filter((d) => ACTUALES.has(d.href));
  const archivo = drops.filter((d) => !ACTUALES.has(d.href));
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pt-[var(--offset)] bg-white">
        <div className="px-4 md:px-6 pt-8 md:pt-10 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Hypestyle</p>
          <h1 className="text-[34px] md:text-[56px] font-semibold tracking-[-0.035em] leading-[1.02]">Colecciones</h1>
          <p className="text-[14px] text-muted-foreground mt-3 max-w-md leading-relaxed">
            Cada drop es una declaración. Producción limitada, stock que no se repite.
          </p>
        </div>

        {/* ── Temporada actual: filas editoriales grandes ── */}
        <div className="px-4 md:px-6 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">Temporada actual</p>
          <div className="space-y-2">
            {actuales.map((drop, i) => (
              <a key={drop.name} href={drop.href} className="group flex flex-col md:flex-row gap-2 overflow-hidden">
                <div className={`relative overflow-hidden rounded-[4px] bg-bg-alt flex-shrink-0 w-full md:w-[420px] lg:w-[560px] ${i % 2 === 0 ? "md:order-1" : "md:order-2"}`} style={{ aspectRatio: "4/3" }}>
                  <img src={dropSrc(drop.image)} alt={drop.name}
                    className={`w-full h-full group-hover:scale-[1.03] transition-transform duration-700 ${drop.mockup ? 'object-contain p-8 md:p-10 [filter:drop-shadow(0_14px_24px_rgba(0,0,0,0.16))]' : 'object-cover'}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
                  {drop.status === "nuevo" && (
                    <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 bg-white text-foreground rounded-[4px] shadow-sm">Nuevo</span>
                  )}
                </div>
                <div className={`flex-1 bg-bg-alt rounded-[4px] flex flex-col justify-between p-8 md:p-12 ${i % 2 === 0 ? "md:order-2" : "md:order-1"}`}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">{drop.season}</p>
                    <h2 className="text-[26px] md:text-[38px] font-semibold tracking-[-0.035em] leading-tight mb-4">{drop.name}</h2>
                    <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm">{drop.description}</p>
                  </div>
                  <span className="mt-8 text-[11px] md:text-[12px] font-semibold uppercase underline underline-offset-4 flex items-center gap-1.5">
                    Ver colección
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Archivo: cápsulas y colabs pasadas, tratamiento sobrio uniforme ── */}
        <div className="px-4 md:px-6 pt-10 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">Archivo</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-2 md:gap-x-3 gap-y-7">
            {archivo.map((drop) => (
              <a key={drop.name} href={drop.href} className="group block">
                <div className="relative overflow-hidden rounded-[4px] bg-bg-alt" style={{ aspectRatio: "4/3" }}>
                  <img src={dropSrc(drop.image)} alt={drop.name}
                    className={`w-full h-full group-hover:scale-[1.03] transition-transform duration-700 ${drop.mockup ? 'object-contain p-8 md:p-10 [filter:drop-shadow(0_14px_24px_rgba(0,0,0,0.16))]' : 'object-cover'}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
                  {drop.status !== "disponible" && drop.status !== "nuevo" && (
                    <span className="absolute top-3 left-3 text-[9px] font-semibold uppercase tracking-wider px-2 py-1 bg-background/85 text-foreground backdrop-blur-sm rounded-[4px]">
                      {drop.status === "not for sale" ? "Not for sale" : drop.status}
                    </span>
                  )}
                </div>
                <div className="mt-3 px-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{drop.season}</p>
                  <p className="text-[15px] md:text-[17px] font-semibold tracking-[-0.02em] leading-tight mt-1">{drop.name}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 underline underline-offset-4 decoration-foreground/30">{drop.cta ?? "Ver colección"}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* "Shop por prenda" salió (12/10): duplicaba las prendas del mega
            menú con mockups que no estaban a la altura. Si vuelve, se rearma
            con fotos de campaña reales. */}
        <div className="pb-14" />
      </main>
      <Footer />
    </>
  );
}
