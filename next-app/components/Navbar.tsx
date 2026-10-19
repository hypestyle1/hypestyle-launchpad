'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, Menu, X, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { imgSrc } from '@/lib/img';
import MenuDestacados from '@/components/MenuDestacados';
import { CURRENCIES } from '@/lib/currency';
import type { Language } from '@/context/LocaleContext';
import { useCart } from '@/context/CartContext';
import { useLocale } from '@/context/LocaleContext';
import { useWishlist } from '@/context/WishlistContext';
import { useProducts } from '@/hooks/useProducts';
import LocalePopup from '@/components/LocalePopup';
import { usePromo3x2Status } from '@/hooks/usePromo3x2Status';

// Arquitectura 2026: Shop (mega menú) · Colecciones · Nosotros · Contacto.
// FAQs y Políticas viven en el footer y al pie del menú mobile. Los lookbooks
// salen del flujo de compra: están integrados en /colecciones (Archivo).
const navLinks = [
  { label: 'Shop',        href: '/productos',   hasDropdown: true,  routeMatch: '/productos' },
  { label: 'Colecciones', href: '/colecciones', hasDropdown: false, routeMatch: '/colecciones', menu: 'colecciones' },
  { label: 'Nosotros',    href: '/nosotros',    hasDropdown: false, routeMatch: '/nosotros' },
  { label: 'Contacto',    href: '/contacto',    hasDropdown: false, routeMatch: '/contacto', menu: 'contacto' },
];

// Desplegable chico de Colecciones: colecciones de tienda + el hub de colabs
// (con flecha: despliega las cuatro adentro del mismo menú).
type MenuItem = { label: string; href: string; children?: { label: string; href: string }[] };
const menuColecciones: MenuItem[] = [
  { label: 'Spring Summer 27 · Part 01', href: '/colecciones/ss27' },
  { label: 'Fall Winter 26',             href: '/colecciones/fw26' },
  { label: 'Esenciales — Regular Tees',  href: '/colecciones/regular-tees' },
  { label: 'Colaboraciones', href: '/colaboraciones', children: [
    { label: 'Fileteado Porteño x Genovese',    href: '/lookbook-genovese' },
    { label: 'La Ciudad del Pop x Mir Nicolás', href: '/lookbook-mir' },
    { label: 'CULTO x Neo Pistea',              href: '/lookbook-neo' },
    { label: 'Tie Dye x Ferpa',                 href: '/lookbook-ferpa' },
  ] },
  { label: 'Ver todas las colecciones',  href: '/colecciones' },
];
const menuContacto = [
  { label: 'Escribinos',              href: '/contacto' },
  { label: 'Crea contenido con Hype', href: '/creadores' },
  { label: 'Sumá Hype a tu local',    href: '/mayoristas/solicitud' },
];
const smallMenus: Record<string, MenuItem[]> = { colecciones: menuColecciones, contacto: menuContacto };

// Mega menú 2026: Comprar / Prendas (tipo de prenda a 1 click) / Colecciones.
// SALE sin rojo permanente (liquidación ≠ lanzamiento); FW26 presente.
const megaMenu = {
  general: [
    { label: 'New In',    href: '/new-in',         homeHash: null, isNew: true },
    { label: 'Ver todo',  href: '/productos',      homeHash: null, isNew: false },
    { label: 'Gift Card', href: '/gift-cards',     homeHash: null, isNew: false },
    { label: 'SALE',      href: '/special-prices', homeHash: null, isNew: false },
  ],
  categorias: [
    { label: 'Remeras',     href: '/tees',        indent: false },
    { label: 'Hoodies',     href: '/hoodies',     indent: false },
    { label: 'Longsleeves', href: '/longsleeves', indent: false },
    { label: 'Pantalones',  href: '/pants',       indent: false },
    { label: 'Jorts',       href: '/jorts',       indent: false },
    { label: 'Conjuntos',   href: '/sets',        indent: false },
    { label: 'Accesorios',  href: '/accesorios',  indent: false },
  ],
  colecciones: [
    { label: 'Spring Summer 27', href: '/colecciones/ss27' },
    { label: 'Fall Winter 26',   href: '/colecciones/fw26' },
    { label: 'Esenciales',       href: '/colecciones/regular-tees' },
    { label: 'Ver todas',        href: '/colecciones' },
  ],
};

const mobilePanels = {
  main: {
    title: 'Shop',
    items: [
      { label: 'Ver todos los productos', href: '/productos',      homeHash: null,             panel: null },
      { label: 'New In',                   href: '/new-in',          homeHash: null,   panel: null },
      { label: 'Remeras',                  href: '/tees',            homeHash: null,   panel: null },
      { label: 'Hoodies',                  href: '/hoodies',         homeHash: null,   panel: null },
      { label: 'Longsleeves',              href: '/longsleeves',     homeHash: null,   panel: null },
      { label: 'Pantalones',               href: '/pants',           homeHash: null,   panel: null },
      { label: 'Jorts',                    href: '/jorts',           homeHash: null,   panel: null },
      { label: 'Conjuntos',                href: '/sets',            homeHash: null,   panel: null },
      { label: 'Accesorios',               href: '/accesorios',      homeHash: null,   panel: null },
      { label: 'Gift Card',                href: '/gift-cards',      homeHash: null,   panel: null },
      { label: 'SALE',                     href: '/special-prices',  homeHash: null,   panel: null },
    ],
    collections: [
      { label: 'Spring Summer 27', href: '/colecciones/ss27' },
      { label: 'Fall Winter 26',   href: '/colecciones/fw26' },
      { label: 'Esenciales',       href: '/colecciones/regular-tees' },
      { label: 'Colaboraciones',   href: '/colaboraciones' },
      { label: 'Ver todas',        href: '/colecciones' },
    ],
  },
  // Los viejos sub-paneles Arriba/Abajo/Accesorios se retiran: tenían links
  // rotos (Pantalones y Jorts iban los dos a /abajo; Gorras/Beanies/Rings los
  // tres a /accesorios) y con las prendas a 1 click ya no hacen falta. Quedan
  // vacíos para no tocar el tipo del estado mobilePanel.
  arriba:     { title: 'Arriba',     verTodo: '/arriba',     items: [] },
  abajo:      { title: 'Abajo',      verTodo: '/abajo',      items: [] },
  accesorios: { title: 'Accesorios', verTodo: '/accesorios', items: [] },
};

type GrupoMenu = 'prendas' | 'colecciones';

/**
 * Filas grandes del menú mobile. Las fotos tienen que asomarse sin scrollear,
 * así que la lista es corta: las seis categorías de prendas y las colecciones
 * viven adentro de un desplegable (referencia: emestudios.com, 19/10/2026).
 */
const MENU_MOBILE: { label: string; href?: string; grupo?: GrupoMenu; destacado?: boolean }[] = [
  { label: 'New In',      href: '/new-in' },
  { label: 'Prendas',     grupo: 'prendas' },
  { label: 'Accesorios',  href: '/accesorios' },
  { label: 'Colecciones', grupo: 'colecciones' },
  { label: 'Gift Card',   href: '/gift-cards' },
  { label: 'Sale', href: '/special-prices', destacado: true },
];

const GRUPOS_MENU: Record<GrupoMenu, { label: string; href: string }[]> = {
  prendas: [
    { label: 'Ver todos los productos', href: '/productos' },
    { label: 'Remeras',     href: '/tees' },
    { label: 'Hoodies',     href: '/hoodies' },
    { label: 'Longsleeves', href: '/longsleeves' },
    { label: 'Pantalones',  href: '/pants' },
    { label: 'Jorts',       href: '/jorts' },
    { label: 'Conjuntos',   href: '/sets' },
  ],
  colecciones: [
    { label: 'Spring Summer 27', href: '/colecciones/ss27' },
    { label: 'Fall Winter 26',   href: '/colecciones/fw26' },
    { label: 'Esenciales',       href: '/colecciones/regular-tees' },
    { label: 'Colaboraciones',   href: '/colaboraciones' },
    { label: 'Ver todas',        href: '/colecciones' },
  ],
};

/** Mismo orden que LocalePopup; acá van solo los códigos, como en EME. */
const IDIOMAS: Language[] = ['ES', 'EN', 'PT', 'DE', 'FR', 'IT'];

const glassStyle = {
  background: 'rgba(240, 238, 232, 0.82)',
  backdropFilter: 'blur(32px) saturate(200%)',
  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.6)',
} as React.CSSProperties;

// El logo del navbar se dibuja a 18–25 px de alto. El PNG original mide
// 4000x1757 (65 KB, "sobredimensionado 29x" en la auditoría del 11/10): esta
// versión de 100 px de alto alcanza para DPR 4 y pesa una fracción.
const LOGO_NAV = '/logo-hypestyle-nav.png';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'main' | 'arriba' | 'abajo' | 'accesorios'>('main');
  const [grupoAbierto, setGrupoAbierto] = useState<GrupoMenu | null>(null);
  const [shopOpen, setShopOpen]       = useState(false);
  // Qué desplegable chico está abierto ('colecciones' | 'contacto'), o ninguno.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Sub-lista expandida adentro de un desplegable (Colaboraciones).
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [logoError, setLogoError]     = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { count, setDrawerOpen } = useCart();
  const { items: wishlistItems, setDrawerOpen: openWishlist } = useWishlist();
  const { formatPrice, t, language, setLanguage, currency, setCurrency } = useLocale();
  const { data: allProducts = [] } = useProducts(0);
  const { phase: promoPhase } = usePromo3x2Status();
  const argMode = promoPhase === 'pre' || promoPhase === 'live' || promoPhase === 'won';

  const searchResults = searchQuery.length >= 2
    ? allProducts
        .filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];
  // La gift card no es un producto del catálogo (tiene su propia página), así
  // que el buscador la ofrece como atajo cuando la búsqueda va por ahí.
  const searchGift = searchQuery.length >= 2 && /gift|regal|tarjeta|cr[eé]dito|vale/i.test(searchQuery);

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
    if (!mobileOpen) { setMobilePanel('main'); setGrupoAbierto(null); }
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const handleSmartLink = (href: string, homeHash: string | null) => {
    setShopOpen(false);
    setOpenMenu(null);
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
          // Material glass único (globals.css, --glass-nav-*). El modo
          // argentino (promo 3x2) conserva su celeste hardcodeado.
          background: argMode ? 'rgba(117, 170, 219, 0.30)' : 'var(--glass-nav-bg)',
          backdropFilter: 'var(--glass-nav-filter)',
          WebkitBackdropFilter: 'var(--glass-nav-filter)',
          border: argMode
            ? '1px solid rgba(212, 175, 55, 0.55)'
            : (scrolled || shopOpen ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.45)'),
          boxShadow: argMode
            ? '0 4px 24px rgba(212,175,55,0.22), inset 0 1px 0 rgba(255,255,255,0.4)'
            : (scrolled || shopOpen
              ? '0 8px 40px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.55)'
              : '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.55)'),
        }}
        onMouseLeave={() => { setShopOpen(false); setOpenMenu(null); }}
      >
        {/* La luz que recorre el borde del pill (elegida 13/10). */}
        <span aria-hidden className="hs-nav-beam" />
        <div className="h-full max-w-[1400px] mx-auto px-4 flex items-center relative">
          {searchOpen ? (
            <div className="flex items-center w-full gap-3">
              <Search className="w-4 h-4 flex-shrink-0 text-foreground/40" strokeWidth={1.2} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Buscar productos...')}
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
                    <div key={t(link.label)} className={`relative items-center ${(link as { wideOnly?: boolean }).wideOnly ? 'hidden xl:flex' : 'flex'}`}
                      onMouseEnter={() => {
                        if (link.hasDropdown) setShopOpen(true);
                        const m = (link as { menu?: string }).menu;
                        if (m) setOpenMenu(m);
                      }}>
                      <Link href={link.href}
                        className="relative text-[12px] font-normal tracking-[0.06em] text-foreground flex items-center gap-1 px-3 py-1.5 rounded-[8px] hover:bg-black/[0.06] transition-colors duration-150">
                        <span className="whitespace-nowrap">{t(link.label)}</span>
                        {link.hasDropdown && (
                          <ChevronDown className="w-3 h-3 transition-transform duration-200" strokeWidth={1.2}
                            style={{ transform: shopOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        )}
                        {(link as { menu?: string }).menu && (
                          <ChevronDown className="w-3 h-3 transition-transform duration-200" strokeWidth={1.2}
                            style={{ transform: openMenu === (link as { menu?: string }).menu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        )}
                        {isActive && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                        )}
                      </Link>

                      {(link as { menu?: string }).menu && openMenu === (link as { menu?: string }).menu && !searchOpen && (
                        <div
                          className="absolute top-full left-0 mt-1.5 min-w-[240px] rounded-[12px] py-2 animate-in fade-in slide-in-from-top-1 duration-150"
                          style={glassStyle}
                          onMouseLeave={() => setOpenMenu(null)}
                        >
                          {smallMenus[(link as { menu?: string }).menu!].map((l) => (
                            l.children ? (
                              <div key={t(l.label)}>
                                <button
                                  onClick={() => setOpenSub(openSub === l.label ? null : l.label)}
                                  aria-expanded={openSub === l.label}
                                  className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.05] transition-colors text-left"
                                >
                                  {t(l.label)}
                                  <ChevronDown className="w-3 h-3 transition-transform duration-200" strokeWidth={1.2}
                                    style={{ transform: openSub === l.label ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                </button>
                                {openSub === l.label && (
                                  <>
                                    {l.children.map((c) => (
                                      <Link key={t(c.label)} href={c.href} onClick={() => { setOpenMenu(null); setOpenSub(null); }}
                                        className="block pl-7 pr-4 py-1.5 text-[12px] text-foreground/60 hover:text-foreground hover:bg-black/[0.05] transition-colors">
                                        {t(c.label)}
                                      </Link>
                                    ))}
                                    <Link href={l.href} onClick={() => { setOpenMenu(null); setOpenSub(null); }}
                                      className="block pl-7 pr-4 py-1.5 text-[12px] font-semibold underline underline-offset-4 text-foreground/70 hover:text-foreground transition-colors">
                                      {t('Ver todas')}
                                    </Link>
                                  </>
                                )}
                              </div>
                            ) : (
                              <Link
                                key={t(l.label)}
                                href={l.href}
                                onClick={() => setOpenMenu(null)}
                                className="block px-4 py-2 text-[13px] text-foreground/70 hover:text-foreground hover:bg-black/[0.05] transition-colors"
                              >
                                {t(l.label)}
                              </Link>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Logo desktop */}
              <Link href="/" className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center z-10">
                {!logoError ? (
                  <img src={LOGO_NAV} alt="Hypestyle"
                    className="w-auto transition-all duration-300 hs-logo-3d"
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
                    <img src={LOGO_NAV} alt="Hypestyle"
                      className="w-auto hs-logo-3d" style={{ height: scrolled ? '18px' : '22px' }}
                      onError={() => setLogoError(true)} />
                  ) : (
                    <span className="text-[15px] font-normal tracking-[0.08em] text-foreground">Hypestyle</span>
                  )}
                </Link>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 flex-1">
                {/* div y no span: LocalePopup devuelve un <div>, y un bloque
                    adentro de un inline es HTML inválido. Estaba en todas las
                    páginas porque el navbar es global. */}
                <div className="hidden lg:block"><LocalePopup /></div>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">{t('Comprar')}</p>
                {megaMenu.general.map((l) => (
                  <button key={t(l.label)} onClick={() => handleSmartLink(l.href, l.homeHash)}
                    className="flex items-center gap-2 text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors mb-2.5 w-full text-left">
                    {(l as { isSale?: boolean }).isSale
                      ? <span className="text-[11px] font-bold uppercase tracking-[0.12em] bg-red-600 text-white px-2 py-0.5 rounded-[4px]">{t(l.label)}</span>
                      : t(l.label)}
                    {l.isNew && <span className="text-[9px] font-bold uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5 rounded-[4px]">NEW</span>}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">{t('Prendas')}</p>
                {megaMenu.categorias.map((l) => (
                  <Link key={t(l.label)} href={l.href} onClick={() => setShopOpen(false)}
                    className="block text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors mb-2.5">
                    {t(l.label)}
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/35 mb-4">{t('Colecciones')}</p>
                {megaMenu.colecciones.map((l) => (
                  <Link key={t(l.label)} href={l.href} onClick={() => setShopOpen(false)}
                    className="block text-[13px] text-foreground/70 hover:text-foreground transition-colors mb-2.5">
                    {t(l.label)}
                  </Link>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-sm">
                {/* OJO: era hero-duo-grey.webp (sin -hd), que no existe en
                    public/ — la foto del mega menú estaba rota en producción. */}
                <img src="/ss27/coleccion/hero-duo-grey-hd.webp" alt="Spring Summer 27"
                  className="w-full h-full object-cover" style={{ maxHeight: '220px' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-0.5">{t('Colección')}</p>
                    <p className="text-[14px] font-bold text-white leading-tight">Spring Summer 27</p>
                    <Link href="/colecciones/ss27" onClick={() => setShopOpen(false)}
                      className="text-[11px] text-white/70 hover:text-white transition-colors mt-1 block">
                      {t('Ver colección →')}
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
              {searchGift && (
                <Link href="/gift-cards"
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-black/[0.06] transition-colors">
                  <span className="w-10 h-10 flex-shrink-0 rounded-[6px] bg-[#141414] flex items-center justify-center">
                    <img src={LOGO_NAV} alt="" className="h-3 w-auto invert" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">Gift Card</p>
                    <p className="text-[10px] text-text-light uppercase tracking-[0.12em]">{t('Regalá crédito · de $50.000 en adelante')}</p>
                  </div>
                </Link>
              )}
              {searchResults.length > 0 || searchGift ? searchResults.map((p) => (
                <Link key={p.slug} href={`/producto/${p.slug}`}
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-black/[0.06] transition-colors">
                  <img src={imgSrc(p.image)} alt={p.name}
                    className="w-10 h-10 object-cover flex-shrink-0 bg-bg-alt"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-text-light uppercase tracking-[0.12em]">{p.category}</p>
                  </div>
                  <p className="text-[12px] font-semibold flex-shrink-0">{formatPrice(p.price)}</p>
                </Link>
              )) : (
                <p className="text-[12px] text-text-light text-center py-4">{t('Sin resultados para')} &ldquo;{searchQuery}&rdquo;</p>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu. z-[100]: por encima de los flotantes (WhatsApp, reseñas y
          player van en z-[90]; la barra sticky de la ficha en z-50). Con z-50
          quedaban pintados sobre el menú abierto y tapaban sus últimas filas y
          las del selector de idioma y moneda. Sigue por debajo del carrito
          (z-[150]) y de los modales. */}
      {mobileOpen && (
        <>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobile}
          className="fixed inset-0 z-[99] bg-black/10 cursor-default"
        />
        <div className="fixed left-4 right-4 z-[100] flex flex-col overflow-hidden rounded-[14px] border border-black/10 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
          style={{
            top: 'var(--announce-h)',
            maxHeight: 'calc(100dvh - var(--announce-h) - 16px)',
            // 0.96 era casi opaco: el blur no se veía y el menú tapaba la
            // página entera. Con 0.68 y más blur se ve el fondo desenfocado
            // detrás (referencia: emestudios.com, 19/10) sin perder contraste:
            // el texto es casi negro sobre un beige claro.
            background: 'rgba(240, 238, 232, 0.40)',
            backdropFilter: 'blur(52px) saturate(160%)',
            WebkitBackdropFilter: 'blur(52px) saturate(160%)',
          }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/25">
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
                <img src={LOGO_NAV} alt="Hypestyle" className="h-5 w-auto" onError={() => setLogoError(true)} />
              ) : (
                <span className="text-[15px] font-normal tracking-[0.08em]">Hypestyle</span>
              )}
            </Link>
            <div className="flex items-center gap-3">
              <LocalePopup />
              <button onClick={() => { closeMobile(); openWishlist(true); }} className="relative" aria-label="Favoritos">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-foreground text-primary-foreground text-[9px] font-medium flex items-center justify-center rounded-full">
                    {wishlistItems.length}
                  </span>
                )}
              </button>
              <button onClick={() => { closeMobile(); setDrawerOpen(true); }} className="relative" aria-label="Carrito">
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40 mb-1">{'title' in panel ? t(panel.title) : ''}</p>
              {'verTodo' in panel && (
                <Link href={panel.verTodo} onClick={closeMobile}
                  className="text-[13px] font-semibold underline underline-offset-4 text-foreground/60 hover:text-foreground transition-colors">
                  {t('Ver todo en')} {'title' in panel ? t(panel.title) : ''}
                </Link>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
            {mobilePanel === 'main' ? (
              <>
                <div className="mb-6">
                  {MENU_MOBILE.map((item) => {
                    const abierto = !!item.grupo && grupoAbierto === item.grupo;
                    return (
                      <div key={item.label} className="border-b border-black/25 last:border-0">
                        {item.grupo ? (
                          <>
                            <button onClick={() => setGrupoAbierto(abierto ? null : item.grupo!)}
                              aria-expanded={abierto}
                              className="w-full flex items-center justify-between py-2.5 text-left">
                              <span className="text-[20px] font-normal tracking-tight">{t(item.label)}</span>
                              <ChevronDown strokeWidth={2.25}
                                className={`w-[22px] h-[22px] text-foreground transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                            </button>
                            {abierto && (
                              <div className="pb-3">
                                {GRUPOS_MENU[item.grupo].map((l) => (
                                  <button key={l.label}
                                    onClick={() => { handleSmartLink(l.href, null); closeMobile(); }}
                                    className="block w-full text-left text-[15px] text-foreground/60 hover:text-foreground transition-colors py-1.5">
                                    {t(l.label)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <button onClick={() => { handleSmartLink(item.href!, null); closeMobile(); }}
                            className="w-full flex items-center py-2.5 text-left">
                            <span className={`text-[20px] tracking-tight ${item.destacado ? 'font-semibold' : 'font-normal'}`}>
                              {t(item.label)}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <MenuDestacados onNavegar={closeMobile} />

                {/* Lo que más se busca cuando el menú no es para comprar.
                    En recuadros chicos pasaba desapercibido: va grande, en
                    negrita y alineado a la izquierda, como en EME. */}
                <div className="mb-6 space-y-1.5">
                  {[
                    { label: 'FAQs',          href: '/faqs' },
                    { label: 'Quiénes Somos', href: '/nosotros' },
                    { label: 'Políticas',     href: '/politicas-de-devolucion' },
                  ].map((l) => (
                    <Link key={t(l.label)} href={l.href} onClick={closeMobile}
                      className="block text-[19px] font-semibold tracking-tight hover:opacity-70 transition-opacity">
                      {t(l.label)}
                    </Link>
                  ))}
                </div>

                {/* Idioma y moneda a la vista, como EME. El globo del encabezado
                    sigue abriendo el popup completo, con los nombres enteros. */}
                <div className="mb-6 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {IDIOMAS.map((code) => (
                      <button key={code} onClick={() => setLanguage(code)}
                        className={`text-[12px] tracking-[0.1em] pb-0.5 border-b transition-colors ${
                          language === code ? 'border-foreground text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground'
                        }`}>
                        {code}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {CURRENCIES.map((c) => (
                      <button key={c.code} onClick={() => setCurrency(c.code)}
                        className={`text-[12px] tracking-[0.1em] pb-0.5 border-b transition-colors ${
                          currency === c.code ? 'border-foreground text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground'
                        }`}>
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-foreground/10 pt-4 space-y-1">
                  {/* Los lookbooks salen del menú de compra: viven en el
                      Archivo de /colecciones. Acá quedan las institucionales. */}
                  {[
                    { label: 'Reseñas',  href: '/reviews' },
                    { label: 'Contacto', href: '/contacto' },
                    { label: 'Crea contenido con Hype', href: '/creadores' },
                    { label: 'Sumá Hype a tu local',    href: '/mayoristas/solicitud' },
                  ].map((l) => (
                    <Link key={t(l.label)} href={l.href} onClick={closeMobile}
                      className="block text-[14px] text-foreground/50 hover:text-foreground transition-colors py-1">
                      {t(l.label)}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1 mt-4">
                {'items' in panel && panel.items.map((item) => (
                  item.panel ? (
                    <button key={t(item.label)} onClick={() => setMobilePanel(item.panel as any)}
                      className="w-full flex items-center justify-between py-3 border-b border-foreground/8 last:border-0">
                      <span className="text-[20px] font-normal tracking-tight">{t(item.label)}</span>
                      <ChevronRight className="w-4 h-4 text-foreground/30" strokeWidth={1.5} />
                    </button>
                  ) : (
                    <Link key={t(item.label)} href={item.href!} onClick={closeMobile}
                      className="flex items-center justify-between py-3 border-b border-foreground/8 last:border-0">
                      <span className="text-[20px] font-normal tracking-tight">{t(item.label)}</span>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </>
  );
}
