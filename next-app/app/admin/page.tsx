'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

// Portada del panel. No existía: /admin daba 404 y había que saberse de memoria
// la URL de cada sección. Muestra lo que está esperando una decisión, que es
// lo primero que uno quiere saber al entrar.

const WP_SECRET_KEY = 'hype_admin_key';

type Pendientes = {
  pedidosSinEmpaquetar: number | null;
  localesPendientes: number | null;
  creadoresSinRevisar: number | null;
  resenasPendientes: number | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function AdminInicio() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [secciones, setSecciones] = useState<string[]>([]);
  const [p, setP] = useState<Pendientes>({ pedidosSinEmpaquetar: null, localesPendientes: null, creadoresSinRevisar: null, resenasPendientes: null });
  const [ventas, setVentas] = useState<{ pagado: number; sinPagar: number } | null>(null);

  useEffect(() => { setAdminKey(sessionStorage.getItem(WP_SECRET_KEY)); }, []);

  const headers = useCallback((): Record<string, string> => (adminKey ? { 'x-admin-key': adminKey } : {}), [adminKey]);

  useEffect(() => {
    fetch('/api/admin/auth/me', { headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.ok) { setAutorizado(true); setSecciones(d.secciones || []); }
        else setAutorizado(false);
      })
      .catch(() => setAutorizado(false));
  }, [headers]);

  const puede = (s: string) => secciones.includes(s);

  // Cada número se pide por separado y falla solo: si una sección no responde,
  // el resto de la portada sigue sirviendo.
  useEffect(() => {
    if (!autorizado) return;

    if (puede('creadores')) {
      fetch('/api/admin/creadores', { headers: headers() })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setP(x => ({ ...x, creadoresSinRevisar: (d.creadores || []).filter((c: any) => (c.estado || 'nuevo') === 'nuevo').length })))
        .catch(() => {});
    }
    if (puede('mayoristas')) {
      fetch('/api/admin/mayoristas', { headers: headers() })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (!d) return;
          const l = d.mayoristas || [];
          setP(x => ({ ...x, localesPendientes: l.filter((m: any) => m.status === 'pending').length }));
          setVentas({
            pagado: l.reduce((s: number, m: any) => s + (m.totalSpent || 0), 0),
            sinPagar: l.reduce((s: number, m: any) => s + (m.pendingTotal || 0), 0),
          });
        })
        .catch(() => {});
    }
  }, [autorizado, secciones, headers]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 mb-4">Clave de administrador</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); setAutorizado(null); } }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
          />
          <button
            onClick={() => { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); setAutorizado(null); }}
            className="w-full bg-black text-white rounded-md py-2 text-[13px] font-semibold hover:bg-gray-900"
          >
            Entrar
          </button>
          <Link href="/admin/login" className="block text-[12px] text-gray-400 hover:text-black mt-4 underline">
            O entrá con tu perfil
          </Link>
        </div>
      </div>
    );
  }

  const tarjetas = [
    { seccion: 'pedidos', label: 'Pedidos', href: '/admin/pedidos', detalle: 'Preparar, despachar y seguir', valor: null as number | null },
    { seccion: 'creadores', label: 'Creadores', href: '/admin/creadores', detalle: 'Postulaciones para crear contenido', valor: p.creadoresSinRevisar, sufijo: 'sin revisar' },
    { seccion: 'mayoristas', label: 'Locales', href: '/admin/mayoristas', detalle: 'Comercios que venden Hype', valor: p.localesPendientes, sufijo: 'esperando aprobación' },
    { seccion: 'reviews', label: 'Reseñas', href: '/admin/reviews', detalle: 'Pedidos de reseña y respuestas', valor: null },
    { seccion: 'costos', label: 'Costos y márgenes', href: '/admin/costos', detalle: 'Perfiles de costo por producto', valor: null },
    { seccion: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', detalle: 'Suscriptores y envíos', valor: null },
    { seccion: 'conversaciones', label: 'Conversaciones', href: '/admin/conversaciones', detalle: 'Lo que responde el bot', valor: null },
    { seccion: 'perfiles', label: 'Perfiles', href: '/admin/perfiles', detalle: 'Quién entra y con qué acceso', valor: null },
  ].filter(t => puede(t.seccion));

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-gray-900">Panel</h1>
      <p className="text-[13px] text-gray-500 mt-1">Todo lo que está esperando una decisión.</p>

      {ventas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Cobrado a locales</p>
            <p className="text-[24px] font-bold text-gray-900 mt-1">{fmt(ventas.pagado)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Pedido y sin pagar</p>
            <p className={`text-[24px] font-bold mt-1 ${ventas.sinPagar > 0 ? 'text-amber-700' : 'text-gray-300'}`}>
              {fmt(ventas.sinPagar)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {tarjetas.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold text-gray-900">{t.label}</p>
              {typeof t.valor === 'number' && t.valor > 0 && (
                <span className="text-[11px] font-bold bg-black text-white rounded-full px-2 py-0.5 shrink-0">{t.valor}</span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{t.detalle}</p>
            {typeof t.valor === 'number' && t.valor > 0 && (
              <p className="text-[11px] text-gray-400 mt-2">{t.valor} {t.sufijo}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
