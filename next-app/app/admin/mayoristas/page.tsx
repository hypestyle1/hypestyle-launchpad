'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

const EMPTY = {
  email: '', password: '', first_name: '', last_name: '', company: '',
  address_1: '', city: '', state: '', postcode: '', phone: '',
};

function randomPassword() {
  return Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
}

export default function MayoristasAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [created, setCreated]   = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    setForm(f => f.password ? f : { ...f, password: randomPassword() });
  }, []);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function field(key: keyof typeof EMPTY) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mayorista-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo crear el cliente');
      setCreated({ email: form.email, password: form.password });
      setForm({ ...EMPTY, password: randomPassword() });
    } catch (err: any) {
      setError(err.message || 'Error al crear el cliente');
    } finally {
      setSaving(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-black text-white rounded-md py-2 text-[13px] font-semibold hover:bg-gray-900">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
          <span className="text-gray-300">|</span>
          <span className="text-[14px] font-semibold text-gray-900">Nuevo cliente mayorista</span>
          <Link href="/admin/pedidos" className="text-[12px] text-gray-400 hover:text-black ml-1">← Pedidos</Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {created && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-[13px]">
            <p className="font-semibold text-green-800">Cliente creado ✓</p>
            <p className="text-green-700 mt-1">Pasale estos datos para que entre a <code>/mayoristas</code>:</p>
            <p className="mt-2 font-mono text-[12px] bg-white border border-green-200 rounded px-2 py-1">usuario: {created.email}</p>
            <p className="font-mono text-[12px] bg-white border border-green-200 rounded px-2 py-1 mt-1">contraseña: {created.password}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-[11px] font-medium text-gray-500">
              Email (es el usuario de login)
              <input type="email" required {...field('email')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="col-span-2 text-[11px] font-medium text-gray-500">
              Contraseña
              <div className="flex gap-2 mt-1">
                <input type="text" required {...field('password')} className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black font-mono" />
                <button type="button" onClick={() => setForm(f => ({ ...f, password: randomPassword() }))} className="text-[12px] text-gray-500 hover:text-black px-2 border border-gray-300 rounded-md">
                  Generar
                </button>
              </div>
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Nombre
              <input required {...field('first_name')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Apellido
              <input {...field('last_name')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="col-span-2 text-[11px] font-medium text-gray-500">
              Local / empresa
              <input {...field('company')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="col-span-2 text-[11px] font-medium text-gray-500">
              Dirección
              <input required {...field('address_1')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Ciudad
              <input required {...field('city')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Provincia
              <input {...field('state')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              CP
              <input {...field('postcode')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
            <label className="text-[11px] font-medium text-gray-500">
              Teléfono
              <input required {...field('phone')} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
            </label>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-black text-white rounded-md py-2.5 text-[13px] font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {saving ? 'Creando…' : 'Crear cliente mayorista'}
          </button>
        </form>
      </div>
    </div>
  );
}
