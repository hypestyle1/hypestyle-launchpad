'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS } from '@/lib/admin-format';
import { MetricCard } from '@/components/admin/ui';

// Portada del panel. Muestra lo que está esperando una decisión, que es lo
// primero que uno quiere saber al entrar: pedidos por preparar, plata sin
// cobrar, solicitudes pendientes.

type Pendientes = {
  localesPendientes: number | null;
  creadoresSinRevisar: number | null;
};

type Counts = {
  porEmpaquetar: number;
  empaquetados: number;
  enviadosSinMarcar: number;
  pendientes: number;
};

export default function AdminInicio() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [p, setP] = useState<Pendientes>({ localesPendientes: null, creadoresSinRevisar: null });
  const [counts, setCounts] = useState<Counts | null>(null);
  const [ventas, setVentas] = useState<{ pagado: number; sinPagar: number } | null>(null);

  // Cada número se pide por separado y falla solo: si una sección no responde,
  // el resto de la portada sigue sirviendo.
  useEffect(() => {
    if (!autorizado) return;

    if (puede('pedidos')) {
      fetch('/api/admin/orders/counts', { headers: headers() })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setCounts(d))
        .catch(() => {});
    }
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
  }, [autorizado, puede, headers]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <p className="text-[13px] text-muted-foreground mb-4">Clave de administrador</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring"
          />
          <button
            onClick={() => ingresarConClave(keyInput)}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90"
          >
            Entrar
          </button>
          <Link href="/admin/login" className="block text-[12px] text-muted-foreground/70 hover:text-foreground mt-4 underline">
            O entrá con tu perfil
          </Link>
        </div>
      </div>
    );
  }

  const tarjetas = [
    { seccion: 'pedidos', label: 'Pedidos', href: '/admin/pedidos', detalle: 'Preparar, despachar y seguir', valor: counts?.porEmpaquetar ?? null, sufijo: 'por empaquetar' },
    { seccion: 'creadores', label: 'Creadores', href: '/admin/creadores', detalle: 'Postulaciones para crear contenido', valor: p.creadoresSinRevisar, sufijo: 'sin revisar' },
    { seccion: 'mayoristas', label: 'Locales', href: '/admin/mayoristas', detalle: 'Comercios que venden Hype', valor: p.localesPendientes, sufijo: 'esperando aprobación' },
    { seccion: 'reviews', label: 'Reseñas', href: '/admin/reviews', detalle: 'Pedidos de reseña y respuestas', valor: null as number | null, sufijo: '' },
    { seccion: 'costos', label: 'Costos y márgenes', href: '/admin/costos', detalle: 'Perfiles de costo por producto', valor: null, sufijo: '' },
    { seccion: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', detalle: 'Suscriptores y envíos', valor: null, sufijo: '' },
    { seccion: 'conversaciones', label: 'Conversaciones', href: '/admin/conversaciones', detalle: 'Lo que responde el bot', valor: null, sufijo: '' },
    { seccion: 'perfiles', label: 'Perfiles', href: '/admin/perfiles', detalle: 'Quién entra y con qué acceso', valor: null, sufijo: '' },
  ].filter(t => puede(t.seccion));

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Panel</h1>
      <p className="text-[13px] text-muted-foreground mt-1">Todo lo que está esperando una decisión.</p>

      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <MetricCard label="Por empaquetar" value={counts.porEmpaquetar} tone={counts.porEmpaquetar > 0 ? 'warning' : 'muted'} hint="Pagados, sin rótulo" />
          <MetricCard label="Empaquetados" value={counts.empaquetados} hint="Esperando guía de Andreani" />
          <MetricCard label="Con guía, sin marcar" value={counts.enviadosSinMarcar} hint="Siguen en estado pagado" />
          <MetricCard label="Sin pagar" value={counts.pendientes} tone={counts.pendientes > 0 ? 'critical' : 'muted'} hint="Pedidos esperando el pago" />
        </div>
      )}

      {ventas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <MetricCard label="Cobrado a locales" value={fmtARS(ventas.pagado)} />
          <MetricCard label="Pedido y sin pagar" value={fmtARS(ventas.sinPagar)} tone={ventas.sinPagar > 0 ? 'warning' : 'muted'} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {tarjetas.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="bg-card rounded-lg border border-border p-5 hover:border-border-mid transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold text-foreground">{t.label}</p>
              {typeof t.valor === 'number' && t.valor > 0 && (
                <span className="text-[11px] font-bold bg-primary text-primary-foreground rounded-full px-2 py-0.5 shrink-0">{t.valor}</span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{t.detalle}</p>
            {typeof t.valor === 'number' && t.valor > 0 && (
              <p className="text-[11px] text-muted-foreground/70 mt-2">{t.valor} {t.sufijo}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
