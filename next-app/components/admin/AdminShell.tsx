'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, Search, ExternalLink, LogOut, UserRound } from 'lucide-react';
import { GRUPOS, INICIO, type Seccion } from './nav';
import { CommandPalette } from './CommandPalette';
import { ThemeToggle, useAdminTheme } from './theme';

// Marco del panel: barra lateral fija con las secciones agrupadas, tema
// light/dark/system y paleta de comandos (Ctrl+K).
//
// Antes cada pantalla traía su propia barra con un puñado de links distintos.
// Esto lo unifica, como hacen Shopify y Tienda Nube: la navegación es una
// sola, siempre visible, y muestra solo lo que el perfil puede abrir.

const WP_SECRET_KEY = 'hype_admin_key';
const SIDEBAR_KEY = 'hype_admin_sidebar';

export interface Quien {
  role: 'owner' | 'content';
  id: number | null;
  viaSharedKey?: boolean;
  secciones: Seccion[];
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [quien, setQuien] = useState<Quien | null>(null);
  const [abierto, setAbierto] = useState(false);       // drawer mobile
  const [colapsado, setColapsado] = useState(false);   // sidebar desktop icon-only
  const [paleta, setPaleta] = useState(false);
  const { theme, setTheme, dark } = useAdminTheme();

  const headers = useCallback((): Record<string, string> => {
    const k = typeof window !== 'undefined' ? sessionStorage.getItem(WP_SECRET_KEY) : null;
    return k ? { 'x-admin-key': k } : {};
  }, []);

  useEffect(() => {
    fetch('/api/admin/auth/me', { headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.ok) setQuien(d as Quien); })
      .catch(() => {});
  }, [headers, pathname]);

  useEffect(() => { setColapsado(localStorage.getItem(SIDEBAR_KEY) === 'min'); }, []);

  // Ctrl+K / ⌘K abre la paleta desde cualquier pantalla del panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaleta(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // La pantalla de ingreso no lleva marco: sería navegación hacia lugares a
  // los que todavía no se puede entrar. La de aprobación por mail tampoco: el
  // que llega con ese token no tiene sesión y no debe ver el panel.
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/admin/reset') || pathname.startsWith('/admin/aprobar')) return <>{children}</>;

  // Las vistas para imprimir salen solas, sin barra lateral.
  if (pathname.includes('/rotulo') || pathname.includes('/detalle')) return <>{children}</>;

  // Sin identidad no se muestra ninguna sección: antes `!quien` habilitaba
  // todo, y un visitante sin sesión (o un fallo de auth/me) veía el sidebar
  // completo del panel.
  const puede = (s: Seccion) => !!quien && quien.secciones.includes(s);
  const grupos = GRUPOS
    .map(g => ({ ...g, items: g.items.filter(i => puede(i.seccion)) }))
    .filter(g => g.items.length > 0);

  function toggleColapsado() {
    setColapsado(c => {
      localStorage.setItem(SIDEBAR_KEY, c ? 'full' : 'min');
      return !c;
    });
  }

  async function salir() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    sessionStorage.removeItem(WP_SECRET_KEY);
    router.push('/admin/login');
    router.refresh();
  }

  const linkCls = (activo: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
      activo ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const nav = (mini: boolean) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <button
        onClick={() => setPaleta(true)}
        title="Buscar (Ctrl+K)"
        className={`flex items-center gap-2.5 w-full px-3 py-2 mb-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:border-border-mid hover:text-foreground transition-colors ${mini ? 'justify-center' : ''}`}
      >
        <Search size={14} className="shrink-0" />
        {!mini && <span className="flex-1 text-left">Buscar…</span>}
        {!mini && <kbd className="text-[10px] border border-border rounded px-1 py-0.5">Ctrl K</kbd>}
      </button>

      <Link
        href={INICIO.href}
        onClick={() => setAbierto(false)}
        title={mini ? INICIO.label : undefined}
        className={`${linkCls(pathname === '/admin')} mb-3 ${mini ? 'justify-center' : ''}`}
      >
        <INICIO.Icono size={15} className="shrink-0" />
        {!mini && INICIO.label}
      </Link>

      {grupos.map(g => (
        <div key={g.titulo} className="mb-5">
          {!mini && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 px-3 mb-1.5">{g.titulo}</p>
          )}
          {g.items.map(i => {
            // Sólo el match MÁS específico queda activo: así /admin/content/campaigns
            // no enciende también "Contenido" (/admin/content), ni rentabilidad enciende Resumen.
            const activeMatch = grupos.flatMap(x => x.items).filter(x => pathname.startsWith(x.match)).reduce((b, x) => (x.match.length > b.length ? x.match : b), '');
            const activo = i.match === activeMatch;
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setAbierto(false)}
                title={mini ? i.label : undefined}
                className={`${linkCls(activo)} ${mini ? 'justify-center' : ''}`}
              >
                <i.Icono size={15} className="shrink-0" />
                {!mini && i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const pie = (mini: boolean) => (
    <div className={`border-t border-border px-3 py-3 ${mini ? 'flex flex-col items-center gap-2' : ''}`}>
      {!mini && (
        <div className="flex items-center justify-between mb-2 px-1">
          {quien ? (
            <p className="text-[11px] text-muted-foreground truncate">
              {quien.viaSharedKey ? 'Clave compartida' : quien.role === 'owner' ? 'Acceso completo' : 'Contenido y creadores'}
            </p>
          ) : <span />}
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      )}
      {mini && <ThemeToggle theme={theme} onChange={setTheme} />}
      <div className={`flex items-center ${mini ? 'flex-col gap-2' : 'flex-wrap gap-x-1 gap-y-1'}`}>
        {quien && !quien.viaSharedKey && (
          <Link href="/admin/cuenta" title="Mi cuenta" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Mi cuenta">
            <UserRound size={14} />
          </Link>
        )}
        <Link href="/" title="Ver el sitio" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Ver el sitio">
          <ExternalLink size={14} />
        </Link>
        {quien ? (
          <button onClick={salir} title="Salir" className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted ${mini ? '' : 'ml-auto'}`} aria-label="Salir">
            <LogOut size={14} />
          </button>
        ) : (
          !mini && <Link href="/admin/login" className="text-[12px] text-muted-foreground hover:text-foreground ml-auto px-1">Ingresar</Link>
        )}
      </div>
    </div>
  );

  return (
    <div className={`admin-theme ${dark ? 'dark' : ''} min-h-screen bg-background text-foreground`}>
      {/* Barra superior: en escritorio solo marca, en mobile abre el menú. */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className={`h-5 w-auto ${dark ? 'invert' : ''}`} />
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Panel</span>
        </Link>
        <button
          onClick={() => setAbierto(a => !a)}
          className="text-[12px] font-semibold text-muted-foreground border border-border rounded-md px-3 py-1.5"
          aria-label="Menú"
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>

      {abierto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setAbierto(false)}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-[260px] bg-card flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-4 border-b border-border">
              <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className={`h-5 w-auto ${dark ? 'invert' : ''}`} />
            </div>
            {nav(false)}
            {pie(false)}
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className={`hidden lg:flex lg:flex-col lg:h-screen lg:sticky lg:top-0 bg-card border-r border-border transition-[width] duration-150 ${colapsado ? 'lg:w-[64px]' : 'lg:w-[240px]'}`}>
          <div className={`flex items-center border-b border-border ${colapsado ? 'justify-center py-5' : 'justify-between px-5 py-5'}`}>
            {!colapsado && (
              <Link href="/admin" className="block min-w-0">
                <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className={`h-5 w-auto ${dark ? 'invert' : ''}`} />
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">Panel</p>
              </Link>
            )}
            <button
              onClick={toggleColapsado}
              title={colapsado ? 'Expandir menú' : 'Achicar menú'}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              aria-label={colapsado ? 'Expandir menú' : 'Achicar menú'}
            >
              {colapsado ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
          {nav(colapsado)}
          {pie(colapsado)}
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      <CommandPalette open={paleta} onClose={() => setPaleta(false)} secciones={quien?.secciones || []} />
    </div>
  );
}
