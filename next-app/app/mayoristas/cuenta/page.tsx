'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MayoristaHeader from '@/components/mayorista/MayoristaHeader';
import { formatArs } from '@/lib/mayorista-format';
import { envioResumen } from '@/lib/mayorista-envio';
import { FOOTER_CONDITIONS, WHATSAPP_URL } from '@/lib/mayorista-copy';

// "Mi cuenta" del mayorista: los datos de la cuenta, el mínimo que le rige,
// el saldo a favor, cómo recibe los pedidos, las condiciones y el cambio de
// contraseña. Hasta el 13/10 solo tenía el cambio de contraseña y ni siquiera
// el header para volver.

const MIN_LEN = 8;

interface Perfil {
  email: string;
  billing?: { first_name?: string; last_name?: string; company?: string; address_1?: string; city?: string; state?: string; postcode?: string; phone?: string };
  minOrder: number | null;
  credit: number;
  cuit?: string;
  instagram?: string;
  aprobadoEl?: string | null;
  dni?: string;
  envioMetodo?: string;
  envioDestino?: string;
  exclusividad?: { ciudad: string; desde: string; zona?: { nombre: string; alias: string[] } } | null;
  bloqueoExclusividad?: { ciudad: string; mensaje: string } | null;
}

function fmtDate(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MayoristaCuentaPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [perfilError, setPerfilError] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/mayorista/perfil', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.email) setPerfil(data as Perfil); else setPerfilError(true); })
      .catch(() => setPerfilError(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next.length < MIN_LEN) { setError(`La contraseña nueva necesita al menos ${MIN_LEN} caracteres`); return; }
    if (next !== repeat) { setError('Las dos contraseñas nuevas tienen que coincidir'); return; }

    setSaving(true);
    const res = await fetch('/api/mayorista/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next }),
    });
    setSaving(false);

    if (res.ok) {
      setDone(true);
      setCurrent(''); setNext(''); setRepeat('');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'No pudimos guardar la contraseña');
    }
  }

  const inputClass = 'w-full px-4 py-3 text-[13px] rounded-[12px] border border-border bg-bg-alt/40 placeholder:text-foreground/40 focus:outline-none focus:border-foreground/40 transition-colors';
  const b = perfil?.billing;
  const nombre = b?.company || [b?.first_name, b?.last_name].filter(Boolean).join(' ');
  const direccion = [b?.address_1, b?.city, b?.state, b?.postcode].filter(Boolean).join(', ');
  const envio = perfil ? envioResumen(perfil.envioMetodo, perfil.envioDestino) : '';

  const card = 'rounded-[16px] border border-border p-5';
  const label = 'text-[11px] uppercase tracking-[0.2em] text-foreground/45';

  return (
    <>
      <MayoristaHeader />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
        {perfil?.email && <p className="text-[13px] text-foreground/70 mt-1">Entrás con <span className="font-medium text-foreground">{perfil.email}</span></p>}
        {perfilError && <p className="text-[12px] text-destructive mt-2">No pudimos cargar los datos de tu cuenta. Probá de nuevo en un momento.</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className={card}>
            <p className={label}>Tu local</p>
            {perfil ? (
              <dl className="mt-3 space-y-1.5 text-[13px]">
                {nombre && <div><dt className="sr-only">Nombre</dt><dd className="font-semibold">{nombre}</dd></div>}
                {perfil.cuit && <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">CUIT</dt><dd>{perfil.cuit}</dd></div>}
                {perfil.instagram && <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">Instagram</dt><dd>@{perfil.instagram.replace(/^@/, '')}</dd></div>}
                {b?.city && <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">Ciudad</dt><dd>{[b.city, b.state].filter(Boolean).join(', ')}</dd></div>}
                {perfil.aprobadoEl && <div className="flex gap-2"><dt className="text-muted-foreground w-20 shrink-0">Cliente</dt><dd>desde el {fmtDate(perfil.aprobadoEl)}</dd></div>}
              </dl>
            ) : <p className="mt-3 text-[12px] text-muted-foreground">{perfilError ? '—' : 'Cargando…'}</p>}
            <p className="mt-3 text-[11px] text-muted-foreground">Para cambiar estos datos, <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline">escribinos</a>.</p>
          </section>

          <section className={card}>
            <p className={label}>Condiciones de tu cuenta</p>
            {perfil ? (
              <dl className="mt-3 space-y-2 text-[13px]">
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Pedido mínimo</dt>
                  <dd className="font-semibold text-[15px]">{perfil.minOrder != null ? formatArs(perfil.minOrder) : 'No disponible ahora'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Saldo a favor</dt>
                  <dd className="font-semibold text-[15px]">{perfil.credit > 0 ? <>{formatArs(perfil.credit)} <span className="text-[11px] font-normal text-muted-foreground">se descuenta solo en tu próximo pedido</span></> : <span className="font-normal text-muted-foreground">Sin saldo</span>}</dd>
                </div>
                {perfil.exclusividad && (
                  <div>
                    <dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Exclusividad</dt>
                    <dd>{perfil.exclusividad.zona?.nombre || perfil.exclusividad.ciudad}{perfil.exclusividad.desde ? ` · desde el ${fmtDate(perfil.exclusividad.desde)}` : ''}</dd>
                  </div>
                )}
                {perfil.bloqueoExclusividad && (
                  <div className="rounded-[8px] border border-foreground px-3 py-2 text-[12px]">{perfil.bloqueoExclusividad.mensaje}</div>
                )}
              </dl>
            ) : <p className="mt-3 text-[12px] text-muted-foreground">{perfilError ? '—' : 'Cargando…'}</p>}
          </section>

          <section className={card}>
            <p className={label}>Envío y facturación</p>
            {perfil ? (
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <div><dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Cómo recibís</dt><dd>{envio || 'Lo elegís en cada pedido'}</dd></div>
                <div><dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Dirección</dt><dd>{direccion || 'La cargás en tu primer pedido'}</dd></div>
                {perfil.dni && <div><dt className="text-muted-foreground text-[11px] uppercase tracking-wide">DNI</dt><dd>{perfil.dni}</dd></div>}
                {b?.phone && <div><dt className="text-muted-foreground text-[11px] uppercase tracking-wide">Teléfono</dt><dd>{b.phone}</dd></div>}
              </dl>
            ) : <p className="mt-3 text-[12px] text-muted-foreground">{perfilError ? '—' : 'Cargando…'}</p>}
            <p className="mt-3 text-[11px] text-muted-foreground">Se guardan con cada pedido; podés corregirlos al confirmar el próximo.</p>
          </section>

          <section className={card}>
            <p className={label}>Condiciones comerciales</p>
            <ul className="mt-3 space-y-1 text-[13px] text-foreground/80">
              {FOOTER_CONDITIONS.map(c => <li key={c}>· {c}</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-wide">
              <Link href="/mayoristas/como-funciona" className="underline underline-offset-4">Cómo funciona</Link>
              <Link href="/mayoristas/pedidos" className="underline underline-offset-4">Mis pedidos</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">WhatsApp</a>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-border max-w-[420px]">
          <h2 className="text-[14px] font-semibold">Cambiar contraseña</h2>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Elegí una que recuerdes. La anterior deja de funcionar en el acto.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
            <label className="block">
              <span className="sr-only">Contraseña actual</span>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" required autoComplete="current-password" className={inputClass} />
            </label>
            <label className="block">
              <span className="sr-only">Contraseña nueva</span>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Contraseña nueva" required minLength={MIN_LEN} autoComplete="new-password" className={inputClass} />
            </label>
            <label className="block">
              <span className="sr-only">Repetí la contraseña nueva</span>
              <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} placeholder="Repetí la nueva" required minLength={MIN_LEN} autoComplete="new-password" className={inputClass} />
            </label>
            <p className="text-[11px] text-foreground/40 pt-1">Al menos {MIN_LEN} caracteres.</p>

            {error && <p role="alert" className="text-[12px] text-destructive pt-1">{error}</p>}
            {done && <p role="status" className="text-[12px] text-green-700 pt-1">Listo, tu contraseña quedó actualizada.</p>}

            <Button type="submit" variant="hype" size="ctaFull" disabled={saving} className="py-3 rounded-full !mt-6">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
