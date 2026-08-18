'use client';

import { useEffect, useState } from 'react';

// "Mi cuenta" del mayorista: por ahora, cambiar la contraseña. La del alta la
// generamos nosotros al azar, así que casi nadie la recuerda — acá se la puede
// cambiar por una propia sin depender de que le escribamos.

const MIN_LEN = 8;

export default function MayoristaCuentaPage() {
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/mayorista/perfil')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.email) setEmail(data.email); })
      .catch(() => {});
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

  return (
    <div className="max-w-[420px] mx-auto px-5 sm:px-8 py-10">
      <h1 className="text-[11px] uppercase tracking-[0.2em] text-foreground/45">Mi cuenta</h1>

      {email && (
        <p className="text-[13px] text-foreground/70 mt-3">
          Entrás con <span className="font-medium text-foreground">{email}</span>
        </p>
      )}

      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-[14px] font-semibold">Cambiar contraseña</h2>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
          Elegí una que recuerdes. La anterior deja de funcionar en el acto.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Contraseña actual"
            required
            autoComplete="current-password"
            className={inputClass}
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Contraseña nueva"
            required
            minLength={MIN_LEN}
            autoComplete="new-password"
            className={inputClass}
          />
          <input
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="Repetí la nueva"
            required
            minLength={MIN_LEN}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="text-[11px] text-foreground/40 pt-1">Al menos {MIN_LEN} caracteres.</p>

          {error && <p className="text-[12px] text-destructive pt-1">{error}</p>}
          {done && <p className="text-[12px] text-green-700 pt-1">Listo, tu contraseña quedó actualizada.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-bg-dark text-primary-foreground py-3 text-[12px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-bg-dark/85 transition-colors disabled:opacity-60 !mt-6"
          >
            {saving ? '...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
