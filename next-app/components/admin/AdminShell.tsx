'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Marco del panel: barra lateral fija con las secciones agrupadas.
//
// Antes cada pantalla traía su propia barra con un puñado de links distintos:
// desde Pedidos se llegaba a Costos, desde Costos a otra cosa, y no había
// forma de saber qué existía ni dónde estabas parado. Esto lo unifica, como
// hacen Shopify y Tienda Nube: la navegación es una sola, siempre visible, y
// muestra solo lo que el perfil puede abrir.

const WP_SECRET_KEY = 'hype_admin_key';

type Seccion =
  | 'pedidos' | 'costos' | 'mayoristas' | 'creadores'
  | 'reviews' | 'newsletter' | 'conversaciones' | 'email-metrics' | 'perfiles';

type Item = { label: string; href: string; seccion: Seccion; match: string };
type Grupo = { titulo: string; items: Item[] };

export const GRUPOS: Grupo[] = [
  {
    titulo: 'Ventas',
    items: [
      { label: 'Pedidos', href: '/admin/pedidos', seccion: 'pedidos', match: '/admin/pedidos' },
    ],
  },
  {
    titulo: 'Catálogo',
    items: [
      { label: 'Costos y márgenes', href: '/admin/costos', seccion: 'costos', match: '/admin/costos' },
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { label: 'Locales', href: '/admin/mayoristas', seccion: 'mayoristas', match: '/admin/mayoristas' },
      { label: 'Conversaciones', href: '/admin/conversaciones', seccion: 'conversaciones', match: '/admin/conversaciones' },
    ],
  },
  {
    titulo: 'Contenido',
    items: [
      { label: 'Creadores', href: '/admin/creadores', seccion: 'creadores', match: '/admin/creadores' },
      { label: 'Reseñas', href: '/admin/reviews', seccion: 'reviews', match: '/admin/reviews' },
    ],
  },
  {
    titulo: 'Marketing',
    items: [
      { label: 'Newsletter', href: '/admin/newsletter', seccion: 'newsletter', match: '/admin/newsletter' },
      { label: 'Métricas de email', href: '/admin/email-metrics', seccion: 'email-metrics', match: '/admin/email-metrics' },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { label: 'Perfiles', href: '/admin/perfiles', seccion: 'perfiles', match: '/admin/perfiles' },
    ],
  },
];

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
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);

  const headers = useCallback((): Record<string, string> => {
    const k = typeof window !== 'undefined' ? sessionStorage.getItem(WP_SECRET_KEY) : null;
    return k ? { 'x-admin-key': k } : {};
  }, []);

  useEffect(() => {
    fetch('/api/admin/auth/me', { headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.ok) setQuien(d as Quien); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [headers, pathname]);

  // La pantalla de ingreso no lleva marco: sería navegación hacia lugares a
  // los que todavía no se puede entrar.
  if (pathname.startsWith('/admin/login')) return <>{children}</>;

  // Las vistas para imprimir salen solas, sin barra lateral.
  if (pathname.includes('/rotulo')) return <>{children}</>;

  const puede = (s: Seccion) => !quien || quien.secciones.includes(s);
  const grupos = GRUPOS
    .map(g => ({ ...g, items: g.items.filter(i => puede(i.seccion)) }))
    .filter(g => g.items.length > 0);

  async function salir() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    sessionStorage.removeItem(WP_SECRET_KEY);
    router.push('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <Link
        href="/admin"
        onClick={() => setAbierto(false)}
        className={`block px-3 py-2 rounded-lg text-[13px] font-medium mb-3 transition-colors ${
          pathname === '/admin' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Inicio
      </Link>

      {grupos.map(g => (
        <div key={g.titulo} className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 px-3 mb-1.5">{g.titulo}</p>
          {g.items.map(i => {
            const activo = pathname.startsWith(i.match);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setAbierto(false)}
                className={`block px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  activo ? 'bg-black text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const pie = (
    <div className="border-t border-gray-200 px-4 py-3">
      {quien && (
        <p className="text-[11px] text-gray-400 mb-2">
          {quien.viaSharedKey ? 'Clave compartida' : quien.role === 'owner' ? 'Acceso completo' : 'Contenido y creadores'}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-[12px] text-gray-500 hover:text-black">Ver el sitio</Link>
        <button onClick={salir} className="text-[12px] text-gray-400 hover:text-black ml-auto">Salir</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Barra superior: en escritorio solo marca, en mobile abre el menú. */}
      <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Panel</span>
        </Link>
        <button
          onClick={() => setAbierto(a => !a)}
          className="text-[12px] font-semibold text-gray-600 border border-gray-300 rounded-md px-3 py-1.5"
          aria-label="Menú"
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>

      {abierto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setAbierto(false)}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-[260px] bg-white flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-4 border-b border-gray-200">
              <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
            </div>
            {nav}
            {pie}
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:h-screen lg:sticky lg:top-0 bg-white border-r border-gray-200">
          <Link href="/admin" className="px-5 py-5 border-b border-gray-200 block">
            <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-5 w-auto" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mt-1.5">Panel</p>
          </Link>
          {nav}
          {pie}
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
