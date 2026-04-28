'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, Menu, X, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { useWishlist } from '@/context/WishlistContext';
import { PRODUCTS } from '@/data/products';
import LocalePopup from '@/components/LocalePopup';

const navLinks = [
  { label: 'Shop',          href: '/productos/',               hasDropdown: true,  routeMatch: '/productos' },
  { label: 'Colecciones',   href: '/colecciones/',             hasDropdown: false, routeMatch: '/colecciones' },
  { label: 'FAQs',          href: '/faqs/',                    hasDropdown: false, routeMatch: '/faqs' },
  { label: 'Políticas',     href: '/politicas-de-devolucion/', hasDropdown: false, routeMatch: '/politicas' },
  { label: 'Quiénes Somos', href: '/nosotros/',                hasDropdown: false, routeMatch: '/nosotros' },
];

const megaMenu = {
  general: [
    { label: 'Ver todo',       href: '/productos/',      homeHash: null,             isNew: false },
    { label: 'New In',         href: '/best-sellers/',   homeHash: 'best-sellers',   isNew: true  },
    { label: 'Colecciones',    href: '/colecciones/',    homeHash: null,             isNew: false },
    { label: 'Best Sellers',   href: '/back-in-stock/',  homeHash: 'back-in-stock',  isNew: false },
    { label: 'Special Prices', href: '/special-prices/', homeHash: 'special-prices', isNew: false },
  ],
  categorias: [
    { label: 'Arriba',     href: '/arriba/',     indent: false },
    { label: 'Abajo',      href: '/abajo/',      indent: false },
    { label: 'Accesorios', href: '/accesorios/', indent: false },
    { label: 'Sets',       href: '/sets/',       indent: false },
  ],
  colecciones: [
    { label: 'No Love, Only Style', href: '/no-love-only-style/' },
    { label: 'Camo Set Drop',       href: '/camo-set-drop/' },
    { label: 'Race Drop',           href: '/race/' },
    { label: 'Summer 26',           href: '/summer-26/' },
    { label: 'Regular Tees',        href: '/regular-tees/' },
  ],
};

const mobilePanels = {
  main: {
    title: 'Shop',
    items: [
      { label: 'Ver todos los productos', href: '/productos/',      homeHash: null,             panel: null },
      { label: 'New In',                   href: '/best-sellers/',   homeHash: 'best-sellers',   panel: null },
      { label: 'Colecciones',              href: '/colecciones/',    homeHash: null,             panel: null },
      { label: 'Special Prices',           href: '/special-prices/', homeHash: 'special-prices', panel: null },
      { label: 'Arriba',                   href: null,               homeHash: null,             panel: 'arriba' },
      { label: 'Abajo',                    href: null,               homeHash: null,             panel: 'abajo' },
      { label: 'Accesorios',               href: null,               homeHash: null,             panel: 'accesorios' },
      { label: 'Sets',                     href: '/sets/',           homeHash: null,             panel: null },
    ],
    collections: [
      { label: 'No Love, Only Style', href: '/no-love-only-style/' },
      { label: 'Camo Set Drop',       href: '/camo-set-drop/' },
      { label: 'Race Drop',           href: '/race/' },
      { label: 'Summer 26',           href: '/summer-26/' },
      { label: 'Regular Tees',        href: '/regular-tees/' },
    ],
  },
  arriba:     { title: 'Arriba',     verTodo: '/arriba/',     items: [{ label: 'Hoodies', href: '/hoodies/', panel: null }, { label: 'Remeras', href: '/tees/', panel: null }, { label: 'Accesorios', href: '/accesorios/', panel: null }] },
  abajo:      { title: 'Abajo',      verTodo: '/abajo/',      items: [{ label: 'Pantalones', href: '/abajo/', panel: null }, { label: 'Jorts', href: '/abajo/', panel: null }] },
  accesorios: { title: 'Accesorios', verTodo: '/accesorios/', items: [{ label: 'Gorras', href: '/accesorios/', panel: null }, { label: 'Beanies', href: '/accesorios/', panel: null }, { label: 'Rings', href: '/accesorios/', panel: null }] },
};

const glassStyle = {
  background: 'rgba(240, 238, 232, 0.82)',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.6)',
} as React.CSSProperties;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'main' | 'arriba' | 'abajo' | 'accesorios'>('main');
  const [shopOpen, setShopOpen]       = useState(false);
  const [logoError, setLogoError]     = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { count, setDrawerOpen } = useCart();
  const { items: wishlistItems, setDrawerOpen: openWishlist } = useWishlist();
  const { formatPrice } = useLocale();

  const searchResults = searchQuery.length >= 2
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    if (!mobileOpen) setMobilePanel('main');
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleSmartLink = (href: string, homeHash: string | null) => {
    setShopOpen(false);
    if (homeHash && pathname === '/') {
      document.getElementById(homeHash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(href);
    }
  };

  const navHeight = scrolled ? '40px' : '48px';
  const panel = mobilePanels[mobilePanel];

  return (
    <>
      <nav
        className="fixed top-[var(--announce-h)] left-4 right-4 z-40 transition-all duration-300 overflow-visible"
        style={{
          height: navHeight,
          borderRadius: '14px',
          background: 'rgba(240, 238, 232, 0.62)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: scrolled || shopOpen ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.45)',
          boxShadow: scrolled || shopOpen
            ? '0 8px 40px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.55)'
            : '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.55)',
        }}
        onMouseLeave={() => setShopOpen(false)}
      >
        <div className="h-full max-w-[1400px] mx-auto px-4 flex items-center relative">
          {searchOpen ? (
            <div className="flex items-center w-full gap-3">
              <Search className="w-4 h-4 flex-shrink-0 text-foreground/40" strokeWidth={1.2} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground/30"
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-[11px] text-foreground/40 hover:text-foreground transition-colors flex-shrink-0">
                <X className="w-4 h-4" strokeWidth={1.2} />
              </button>
            </div>
          ) : (
            <>
              {/* Desktop links */}
              <div className="hidden lg:flex items-center gap-1 flex-1">
                {navLinks.map((link) => {
                  const isActive = link.routeMatch && pathname.startsWith(link.routeMatch);
                  return (
                    <div key={link.label} className="relative flex items-center"
                      onMouseEnter={() => link.hasDropdown && setShopOpen(true)}>
                      <Link href={link.href}
                        className="relative text-[12px] font-normal tracking-[0.06em] text-foreground flex items-center gap-1 px-3 py-1.5 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150">
                        <span className="whitespace-nowrap">{link.label}</span>
                        {link.hasDropdown && (
                          <ChevronDown className="w-3 h-3 transition-transform duration-200" strokeWidth={1.2}
                            style={{ transform: shopOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        )}
                        {isActive && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Logo desktop */}
              <Link href="/" className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center z-10">
                {!logoError ? (
                  <img src="/logo-hypestyle-2026.png" alt="Hypestyle"
                    className="w-auto transition-all duration-300"
                    style={{ height: scrolled ? '20px' : '25px' }}
                    onError={() => setLogoError(true)} />
                ) : (
                  <span className="text-[15px] font-normal tracking-[0.08em] text-foreground">Hypestyle</span>
                )}
              </Link>

              {/* Hamburger + logo mobile */}
              <div className="lg:hidden flex items-center gap-2.5 flex-none">
                <button onClick={() => setMobileOpen(true)} aria-label="Menu"
                  className="hover:opacity-50 transition-opacity duration-200">
                  <Menu className="w-5 h-5" strokeWidth={1.2} />
                </button>
                <Link href="/">
                  {!logoError ? (
                    <img src="/logo-hypestyle-2026.png" alt="Hypestyle"
                      className="w-auto" style={{ height: scrolled ? '18px' : '22px' }}
                      onError={() => setLogoError(true)} />
                  ) : (
                    <span className="text-[15px] font-normal tracking-[0.08em] text-foreground">Hypestyle</span>
                  )}
                </Link>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 flex-1">
                <span className="hidden lg:block"><LocalePopup /></span>
                <button onClick={() => setSearchOpen(true)}
                  className="p-1.5 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150" aria-label="Buscar">
                  <Search className="w-4 h-4" strokeWidth={1.2} />
                </button>
                <button onClick={() => openWishlist(true)}
                  className="relative p-1.5 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150" aria-label="Favoritos">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-foreground text-primary-foreground text-[9px] font-medium flex items-center justify-center rounded-full">
                      {wishlistItems.length}
                    </span>
                  )}
                </button>
                <button onClick={() => setDrawerOpen(true)}
                  className="relative p-1.5 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150" aria-label="Carrito">
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.2} />
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-foreground text-primary-foreground text-[9px] font-medium flex items-center justify-center rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mega menu */}
        {shopOpen && !searchOpen && (
          <div className="absolute left-0 right-0 top-full animate-in fade-in slide-in-from-top-1 duration-200"
            style={{ ...glassStyle, borderRadius: '0 0 14px 14px', borderTop: 'none' }}
            onMouseEnter={() => setShopOpen(true)}>
            <div className="max-w-[1400px] mx-auto px-4 py-8 grid grid-cols-[1fr_1fr_1fr_280px] gap-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">Explorar</p>
                {megaMenu.general.map((l) => (
                  <button key={l.label} onClick={() => handleSmartLink(l.href, l.homeHash)}
                    className="flex items-center gap-2 text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors mb-2.5 w-full text-left">
                    {l.label}
                    {l.isNew && <span className="text-[9px] font-bold uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5 rounded-[4px]">NEW</span>}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">Categorías</p>
                {megaMenu.categorias.map((l) => (
                  <Link key={l.label} href={l.href} onClick={() => setShopOpen(false)}
                    className="block text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors mb-2.5">
                    {l.label}
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">Colecciones</p>
                {megaMenu.colecciones.map((l) => (
                  <Link key={l.label} href={l.href} onClick={() => setShopOpen(false)}
                    className="block text-[13px] text-foreground/70 hover:text-foreground transition-colors mb-2.5">
                    {l.label}
                  </Link>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-sm">
                <img src="/stl-look-camo-outdoor.png" alt="Colección"
                  className="w-full h-full object-cover" style={{ maxHeight: '220px' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-0.5">Colección</p>
                    <p className="text-[14px] font-bold text-white leading-tight">Camo Set Drop</p>
                    <Link href="/camo-set-drop/" onClick={() => setShopOpen(false)}
                      className="text-[11px] text-white/70 hover:text-white transition-colors mt-1 block">
                      Ver colección →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchOpen && searchQuery.length >= 2 && (
          <div className="absolute left-0 right-0 top-full animate-in fade-in slide-in-from-top-1 duration-200"
            style={{ ...glassStyle, borderRadius: '0 0 14px 14px', borderTop: 'none' }}>
            <div className="max-w-[1400px] mx-auto p-2">
              {searchResults.length > 0 ? searchResults.map((p) => (
                <Link key={p.slug} href={`/producto/${p.slug}/`}
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-black/[0.06] transition-colors">
                  <img src={`/${p.images[0]}`} alt={p.name}
                    className="w-10 h-10 object-cover flex-shrink-0 bg-bg-alt"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-text-light uppercase tracking-[0.12em]">{p.category}</p>
                  </div>
                  <p className="text-[12px] font-semibold flex-shrink-0">{formatPrice(p.price)}</p>
                </Link>
              )) : (
                <p className="text-[12px] text-text-light text-center py-4">Sin resultados para "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          style={{ background: 'rgba(240, 238, 232, 0.96)', backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/8"
            style={{ paddingTop: 'calc(var(--announce-h) + 16px)' }}>
            {mobilePanel !== 'main' ? (
              <button onClick={() => setMobilePanel('main')} className="flex items-center gap-1 text-foreground/60">
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[13px]">Shop</span>
              </button>
            ) : (
              <button onClick={closeMobile} aria-label="Cerrar"><X className="w-5 h-5" strokeWidth={1.2} /></button>
            )}
            <Link href="/" onClick={closeMobile} className="absolute left-1/2 -translate-x-1/2">
              {!logoError ? (
                <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" onError={() => setLogoError(true)} />
              ) : (
                <span className="text-[15px] font-normal tracking-[0.08em]">Hypestyle</span>
              )}
            </Link>
            <div className="flex items-center gap-3">
              <LocalePopup />
              <button onClick={() => { closeMobile(); setDrawerOpen(true); }} className="relative">
                <ShoppingBag className="w-4 h-4" strokeWidth={1.2} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-foreground text-primary-foreground text-[9px] font-medium flex items-center justify-center rounded-full">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

          {mobilePanel !== 'main' && (
            <div className="px-6 pt-6 pb-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40 mb-1">{'title' in panel ? panel.title : ''}</p>
              {'verTodo' in panel && (
                <Link href={panel.verTodo} onClick={closeMobile}
                  className="text-[13px] font-semibold underline underline-offset-4 text-foreground/60 hover:text-foreground transition-colors">
                  Ver todo en {'title' in panel ? panel.title : ''}
                </Link>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
            {mobilePanel === 'main' ? (
              <>
                <div className="space-y-1 mb-8">
                  {mobilePanels.main.items.map((item) => (
                    item.panel ? (
                      <button key={item.label} onClick={() => setMobilePanel(item.panel as any)}
                        className="w-full flex items-center justify-between py-2.5 border-b border-foreground/8 last:border-0">
                        <span className="text-[22px] font-normal tracking-tight">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
                      </button>
                    ) : (
                      <button key={item.label}
                        onClick={() => { handleSmartLink(item.href!, item.homeHash); closeMobile(); }}
                        className="w-full flex items-center justify-between py-2.5 border-b border-foreground/8 last:border-0 text-left">
                        <span className="text-[22px] font-normal tracking-tight">{item.label}</span>
                      </button>
                    )
                  ))}
                </div>
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/35 mb-3">Colecciones</p>
                  {mobilePanels.main.collections.map((l) => (
                    <Link key={l.label} href={l.href} onClick={closeMobile}
                      className="block text-[14px] text-foreground/60 hover:text-foreground transition-colors py-1.5">
                      {l.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-foreground/10 pt-4 space-y-1">
                  {[
                    { label: 'Colecciones',   href: '/colecciones/' },
                    { label: 'FAQs',          href: '/faqs/' },
                    { label: 'Quiénes Somos', href: '/nosotros/' },
                    { label: 'Políticas',     href: '/politicas-de-devolucion/' },
                    { label: 'Contacto',      href: '/contacto/' },
                  ].map((l) => (
                    <Link key={l.label} href={l.href} onClick={closeMobile}
                      className="block text-[14px] text-foreground/50 hover:text-foreground transition-colors py-1">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1 mt-4">
                {'items' in panel && panel.items.map((item) => (
                  item.panel ? (
                    <button key={item.label} onClick={() => setMobilePanel(item.panel as any)}
                      className="w-full flex items-center justify-between py-3 border-b border-foreground/8 last:border-0">
                      <span className="text-[20px] font-normal tracking-tight">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
                    </button>
                  ) : (
                    <Link key={item.label} href={item.href!} onClick={closeMobile}
                      className="flex items-center justify-between py-3 border-b border-foreground/8 last:border-0">
                      <span className="text-[20px] font-normal tracking-tight">{item.label}</span>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
