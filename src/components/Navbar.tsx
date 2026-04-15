import { useState, useEffect } from "react";
import { Search, ShoppingBag, Menu, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Shop", href: "/productos/", hasDropdown: true },
  { label: "Colecciones", href: "#categorias" },
  { label: "Archive", href: "#back-in-stock" },
  { label: "Políticas", href: "/politicas-de-devolucion/" },
  { label: "Quiénes Somos", href: "/nosotros/" },
];

const shopDropdown = [
  { label: "Ver todos los productos", href: "/productos/" },
  "divider",
  { label: "Arriba", href: "/arriba/" },
  { label: "Accesorios", href: "/accesorios/" },
  { label: "Abajo", href: "/abajo/" },
  "divider",
  { label: "No Love Only Style", href: "/no-love-only-style/" },
  { label: "Camo Set Drop", href: "/camo-set-drop/" },
  { label: "Race", href: "/race/" },
  { label: "Regular Tees", href: "/regular-tees/" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="fixed top-[var(--announce-h)] left-0 right-0 z-40 h-[var(--nav-h)] transition-[border-color] duration-300"
        style={{
          background: "rgba(245, 244, 240, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: scrolled ? "1px solid hsl(var(--border))" : "1px solid transparent",
        }}
      >
        <div className="h-full max-w-[1400px] mx-auto px-4 grid grid-cols-3 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            {!logoError ? (
              <img
                src="/logo-hypestyle-2026.png"
                alt="Hypestyle"
                className="h-5 w-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-[15px] font-normal tracking-[0.08em] text-foreground">
                Hypestyle
              </span>
            )}
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center justify-center gap-8">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.hasDropdown && setShopOpen(true)}
                onMouseLeave={() => link.hasDropdown && setShopOpen(false)}
              >
                <a
                  href={link.href}
                  className="text-[12px] font-normal tracking-[0.06em] text-foreground hover:opacity-50 transition-opacity duration-200 flex items-center gap-1"
                >
                  <span className="whitespace-nowrap">{link.label}</span>
                  {link.hasDropdown && (
                    <ChevronDown className="w-3 h-3" strokeWidth={1.2} />
                  )}
                </a>

                {link.hasDropdown && shopOpen && (
                  <div className="absolute top-full left-0 pt-2">
                    <div
                      className="min-w-[220px] py-2 animate-in fade-in duration-150"
                      style={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                      }}
                    >
                      {shopDropdown.map((item, i) =>
                        item === "divider" ? (
                          <div key={i} className="border-t border-border my-1" />
                        ) : (
                          <a
                            key={i}
                            href={(item as { label: string; href: string }).href}
                            className="block px-4 py-2 text-[12px] font-normal hover:opacity-50 transition-opacity duration-200"
                          >
                            {(item as { label: string; href: string }).label}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button className="hidden lg:block hover:opacity-50 transition-opacity duration-200" aria-label="Buscar">
              <Search className="w-4 h-4" strokeWidth={1.2} />
            </button>
            <a href="/carrito/" className="relative hover:opacity-50 transition-opacity duration-200" aria-label="Carrito">
              <ShoppingBag className="w-4 h-4" strokeWidth={1.2} />
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-foreground text-primary-foreground text-[9px] font-medium flex items-center justify-center rounded-full">
                0
              </span>
            </a>
            <button
              className="lg:hidden hover:opacity-50 transition-opacity duration-200"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.2} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 h-[var(--nav-h)]">
            {!logoError ? (
              <img
                src="/logo-hypestyle-2026.png"
                alt="Hypestyle"
                className="h-5 w-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-[15px] font-normal tracking-[0.08em]">Hypestyle</span>
            )}
            <button onClick={() => setMobileOpen(false)} aria-label="Cerrar">
              <X className="w-5 h-5" strokeWidth={1.2} />
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[24px] font-normal tracking-[0.02em] text-foreground hover:opacity-50 transition-opacity duration-200"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
