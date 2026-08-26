'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Ingreso al panel con perfil propio. Convive con la clave compartida: quien la
// tenga sigue entrando como antes desde cada pantalla, hasta que se apague.

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // La recuperación se resuelve acá mismo: quien llega ya está trabado.
  const [modo, setModo] = useState<'login' | 'olvide'>('login');
  const [mailOlvido, setMailOlvido] = useState('');
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });
    setLoading(false);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      // Cada quien arranca donde puede trabajar: la content manager no tiene
      // por qué aterrizar en una pantalla de pedidos que no va a poder abrir.
      const secciones: string[] = data.secciones ?? [];
      router.push(secciones.includes('pedidos') ? '/admin/pedidos' : '/admin/creadores');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Usuario o contraseña incorrectos');
    }
  }

  async function pedirLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mailOlvido }),
    });
    setLoading(false);
    if (res.ok) {
      // Confirmación igual exista o no el perfil: decir cuál existe sería
      // regalar la lista de quién tiene acceso al panel.
      setEnviado(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message || 'No pudimos enviarte el mail');
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-2" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 text-center mb-7">
          {modo === 'login' ? 'Panel' : 'Recuperar acceso'}
        </p>

        {modo === 'olvide' ? (
          enviado ? (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-900 mb-2">Revisá tu casilla</p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Si ese mail tiene un perfil del panel, le mandamos un link para elegir una contraseña nueva. Vale por 2 horas.
              </p>
              <button
                onClick={() => { setModo('login'); setEnviado(false); setError(''); }}
                className="text-[12px] text-gray-400 hover:text-black mt-6 underline"
              >
                Volver al ingreso
              </button>
            </div>
          ) : (
            <form onSubmit={pedirLink} className="space-y-2.5">
              <p className="text-[12px] text-gray-500 leading-relaxed pb-1">
                Escribí tu mail y te mandamos un link para elegir una contraseña nueva.
              </p>
              <input
                type="email"
                value={mailOlvido}
                onChange={e => setMailOlvido(e.target.value)}
                placeholder="Tu mail"
                autoFocus
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-black"
              />
              {error && <p className="text-[12px] text-red-600 pt-1">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-black text-white rounded-md py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-gray-900 disabled:opacity-50 !mt-5">
                {loading ? '...' : 'Enviar link'}
              </button>
              <div className="text-center !mt-4">
                <button type="button" onClick={() => { setModo('login'); setError(''); }} className="text-[12px] text-gray-400 hover:text-black underline">
                  Volver al ingreso
                </button>
              </div>
            </form>
          )
        ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="Tu mail"
            autoComplete="username"
            autoFocus
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-black"
          />
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-black"
          />

          {error && <p className="text-[12px] text-red-600 pt-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-md py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-gray-900 disabled:opacity-50 !mt-5"
          >
            {loading ? '...' : 'Entrar'}
          </button>

          <div className="text-center !mt-4">
            <button
              type="button"
              onClick={() => { setModo('olvide'); setError(''); setMailOlvido(user.includes('@') ? user : ''); }}
              className="text-[12px] text-gray-400 hover:text-black underline"
            >
              Olvidé mi contraseña
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
