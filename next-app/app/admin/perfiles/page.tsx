'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

// Perfiles del panel: quién entra, con qué acceso y desde cuándo.

const WP_SECRET_KEY = 'hype_admin_key';

type Perfil = {
  id: number; email: string; name: string; role: 'owner' | 'content' | '';
  lastLogin: string | null; loginCount: number; createdAt?: string;
};

const ROLES = [
  { value: 'owner', label: 'Acceso completo', detalle: 'Todo el panel, incluidos pedidos, costos y perfiles.' },
  { value: 'content', label: 'Contenido y creadores', detalle: 'Creadores, reseñas y newsletter. Sin pedidos, costos ni clientes.' },
] as const;

function fmtFecha(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtRelativo(s: string | null) {
  if (!s) return 'nunca entró';
  const dias = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses < 12 ? `hace ${meses} meses` : `hace ${Math.floor(meses / 12)} años`;
}

export default function PerfilesPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoId, setGuardandoId] = useState<number | 'nuevo' | null>(null);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({ name: '', email: '', password: '', role: 'content' as 'owner' | 'content' });
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [creado, setCreado] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const headers = useCallback(
    () => (adminKey ? { 'Content-Type': 'application/json', 'x-admin-key': adminKey } : { 'Content-Type': 'application/json' }),
    [adminKey],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/admin/perfiles', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setPerfiles(data.profiles || []);
        setAuthed(true);
      } else if (res.status === 403) {
        setAuthed(false);
      }
    } finally {
      setCargando(false);
    }
  }, [headers]);

  // Se intenta cargar siempre: si hay sesión de perfil, la cookie alcanza y no
  // hace falta la clave compartida.
  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(email: string, cambios: Partial<Perfil> & { password?: string }, id: number | 'nuevo') {
    setGuardandoId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/perfiles', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email, ...cambios }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'No se pudo guardar'); return false; }
      await cargar();
      return true;
    } finally {
      setGuardandoId(null);
    }
  }

  async function crearPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (nuevo.password.length < 8) { setError('La contraseña necesita al menos 8 caracteres'); return; }
    const ok = await guardar(nuevo.email.trim().toLowerCase(), { name: nuevo.name, role: nuevo.role, password: nuevo.password }, 'nuevo');
    if (ok) {
      setCreado({ email: nuevo.email.trim().toLowerCase(), password: nuevo.password });
      setNuevo({ name: '', email: '', password: '', role: 'content' });
      setMostrarAlta(false);
    }
  }

  if (!authed && !cargando && perfiles.length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 mb-4">Clave de administrador</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); } }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
          />
          <button
            onClick={() => { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); }}
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

  return (
    <div className="">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[14px] font-semibold text-gray-900">Perfiles</span>

        </div>
        <button
          onClick={() => setMostrarAlta(s => !s)}
          className="text-[12px] font-semibold bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-900"
        >
          {mostrarAlta ? 'Cerrar' : '+ Nuevo perfil'}
        </button>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-8">
        <p className="text-[12px] text-gray-500 mb-6 leading-relaxed max-w-[560px]">
          Cada perfil entra con su propio mail y contraseña desde{' '}
          <Link href="/admin/login" className="underline hover:text-black">/admin/login</Link>. El tipo de acceso decide
          qué secciones ve.
        </p>

        {creado && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-[13px] font-semibold text-green-900">Perfil creado</p>
            <p className="text-[12px] text-green-800 mt-1">
              {creado.email} — contraseña: <span className="font-mono font-bold">{creado.password}</span>
            </p>
            <p className="text-[11px] text-green-700 mt-1">
              Se muestra una sola vez. Pasásela y que la cambie cuando entre.
            </p>
          </div>
        )}

        {mostrarAlta && (
          <form onSubmit={crearPerfil} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
            <p className="text-[13px] font-semibold text-gray-900">Nuevo perfil</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Nombre" value={nuevo.name} onChange={e => setNuevo(n => ({ ...n, name: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
              <input required type="email" placeholder="Mail" value={nuevo.email} onChange={e => setNuevo(n => ({ ...n, email: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </div>
            <input required type="text" placeholder="Contraseña inicial (mínimo 8)" value={nuevo.password} onChange={e => setNuevo(n => ({ ...n, password: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-black" />
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setNuevo(n => ({ ...n, role: r.value }))}
                  className={`text-[11px] px-3 py-1.5 rounded-full border ${nuevo.role === r.value ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-500 hover:border-gray-500'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">{ROLES.find(r => r.value === nuevo.role)?.detalle}</p>
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <button type="submit" disabled={guardandoId === 'nuevo'} className="bg-black text-white rounded-md px-4 py-2 text-[12px] font-semibold hover:bg-gray-900 disabled:opacity-50">
              {guardandoId === 'nuevo' ? 'Creando...' : 'Crear perfil'}
            </button>
          </form>
        )}

        {error && !mostrarAlta && <p className="text-[12px] text-red-600 mb-4">{error}</p>}

        <div className="space-y-3">
          {perfiles.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[180px]">
                  <p className="text-[14px] font-semibold text-gray-900">{p.name || p.email}</p>
                  <p className="text-[12px] text-gray-500">{p.email}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {p.loginCount > 0
                      ? `${fmtRelativo(p.lastLogin)} · ${p.loginCount} ingreso${p.loginCount !== 1 ? 's' : ''}`
                      : 'nunca entró'}
                    {p.lastLogin && <span className="text-gray-300"> · {fmtFecha(p.lastLogin)}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => guardar(p.email, { role: r.value }, p.id)}
                      disabled={guardandoId === p.id}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                        p.role === r.value ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { if (confirm(`Quitarle el acceso al panel a ${p.name || p.email}?`)) guardar(p.email, { role: '' }, p.id); }}
                    disabled={guardandoId === p.id}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    Quitar acceso
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!cargando && perfiles.length === 0 && (
            <p className="text-[13px] text-gray-400 text-center py-12">
              Todavía no hay perfiles. Creá el primero con el botón de arriba.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
