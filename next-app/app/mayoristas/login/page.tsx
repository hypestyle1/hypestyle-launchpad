'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MayoristaLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/mayorista/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/mayoristas');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Usuario o contraseña incorrectos');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-white/15 p-8">
        <h1 className="text-2xl font-bold tracking-tight">Hype<span className="text-white/40">.</span></h1>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mt-1">Acceso mayorista</p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Usuario</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoFocus
              required
              className="w-full bg-transparent border border-white/20 px-3 py-2.5 text-sm focus:border-white outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              className="w-full bg-transparent border border-white/20 px-3 py-2.5 text-sm focus:border-white outline-none transition-colors"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-[12px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full bg-white text-black py-3 text-[12px] font-semibold uppercase tracking-wide hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
