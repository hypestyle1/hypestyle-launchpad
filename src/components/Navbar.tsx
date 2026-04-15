import { useState, useEffect } from "react";
import { Search, ShoppingBag, Menu, X, ChevronDown } from "lucide-react";

const navLinks = [
  { label: "Shop", href: "/productos/", hasDropdown: true },
  { label: "Colecciones", href: "#categorias" },
  { label: "Archive", href: "#back-in-stock" },
  { label: "Políticas", href: "/politicas-de-devolucion/" },
  { label: "Quiénes Somos", href: "/faqs/" },
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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
        className={`fixed top-[var(--announce-h)] left-0 right-0 z-40 h-[var(--nav-h)] bg-background transition-[border-color] duration-300 ${
          scrolled ? "border-b border-border" : "border-b border-transparent"
        }`}
      >
        <div className="h-full max-w-[1400px] mx-auto px-4 grid grid-cols-3 items-center">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span className="text-lg font-bold tracking-tight uppercase">HYPESTYLE</span>
          </a>

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
                  className="nav-link text-[13px] font-medium uppercase tracking-[0.08em] pb-0.5 flex items-center gap-1"
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="w-3 h-3" />}
                </a>

                {link.hasDropdown && shopOpen && (
                  <div className="absolute top-full left-0 pt-2">
                    <div className="bg-card border border-border shadow-lg min-w-[220px] py-2">
                      {shopDropdown.map((item, i) =>
                        item === "divider" ? (
                          <div key={i} className="border-t border-border my-1" />
                        ) : (
                          <a
                            key={i}
                            href={(item as { label: string; href: string }).href}
                            className="block px-4 py-2 text-[13px] hover:bg-accent transition-colors"
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
            <button className="hidden lg:block" aria-label="Buscar">
              <Search className="w-5 h-5" />
            </button>
            <a href="/carrito/" className="relative" aria-label="Carrito">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-bg-dark text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                0
              </span>
            </a>
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 h-[var(--nav-h)]">
            <span className="text-lg font-bold tracking-tight uppercase">HYPESTYLE</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Cerrar">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[26px] font-bold uppercase tracking-tight"
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
