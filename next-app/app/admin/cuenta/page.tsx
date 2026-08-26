'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// "Mi cuenta" del panel. La contraseña inicial la genera quien crea el perfil,
// así que sin esta pantalla cada persona arrastraba para siempre la clave que
// le pasaron por mensaje.

const MIN = 8;

export default function CuentaAdminPage() {
  const [quien, setQuien] = useState<{ role: string; id: number | null; viaSharedKey?: boolean } | null>(null);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setQuien(d?.ok ? d : null))
      .catch(() => {});
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setListo(false);
    if (nueva.length < MIN) { setError(`La contraseña nueva necesita al menos ${MIN} caracteres`); return; }
    if (nueva !== repetir) { setError('Las dos contraseñas nuevas tienen que coincidir'); return; }

    setGuardando(true);
    const res = await fetch('/api/admin/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual, nueva }),
    });
    setGuardando(false);

    if (res.ok) {
      setListo(true);
      setActual(''); setNueva(''); setRepetir('');
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message || 'No pudimos guardar la contraseña');
    }
  }

  const input = 'w-full border border-border-mid rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-ring';

  return (
    <div className="max-w-[420px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-[20px] font-bold tracking-tight text-foreground">Mi cuenta</h1>

      {quien?.viaSharedKey ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-5">
          <p className="text-[12px] text-amber-900 leading-relaxed">
            Entraste con la clave compartida, que no es un perfil y no tiene contraseña propia.
            Para cambiar una contraseña, entrá con tu perfil desde{' '}
            <Link href="/admin/login" className="underline">/admin/login</Link>.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground mt-1">
            {quien?.role === 'owner' ? 'Acceso completo' : 'Contenido y creadores'}
          </p>

          <div className="bg-card rounded-lg border border-border p-5 mt-6">
            <h2 className="text-[14px] font-semibold text-foreground">Cambiar contraseña</h2>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              Elegí una que recuerdes. La anterior deja de funcionar en el acto.
            </p>

            <form onSubmit={guardar} className="mt-4 space-y-2.5">
              <input type="password" value={actual} onChange={e => setActual(e.target.value)} placeholder="Contraseña actual" required autoComplete="current-password" className={input} />
              <input type="password" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Contraseña nueva" required minLength={MIN} autoComplete="new-password" className={input} />
              <input type="password" value={repetir} onChange={e => setRepetir(e.target.value)} placeholder="Repetí la nueva" required minLength={MIN} autoComplete="new-password" className={input} />
              <p className="text-[11px] text-muted-foreground/70">Al menos {MIN} caracteres.</p>

              {error && <p className="text-[12px] text-red-600">{error}</p>}
              {listo && <p className="text-[12px] text-green-700">Listo, tu contraseña quedó actualizada.</p>}

              <button type="submit" disabled={guardando} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:opacity-90 disabled:opacity-50 !mt-5">
                {guardando ? '...' : 'Guardar'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
