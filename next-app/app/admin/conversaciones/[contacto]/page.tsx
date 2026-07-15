'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type Mensaje = {
  canal: string;
  rol: string;
  mensaje: string;
  estado: string;
  fecha: string;
};

function fmtDateTime(s: string) {
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
       + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversacionDetallePage({ params }: { params: Promise<{ contacto: string }> }) {
  const { contacto } = use(params);
  const searchParams = useSearchParams();
  const canal = searchParams.get('canal') || '';

  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [nombre, setNombre]     = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    setLoading(true);
    const qs = canal ? `?canal=${encodeURIComponent(canal)}` : '';
    fetch(`/api/admin/conversaciones/${encodeURIComponent(contacto)}${qs}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(res => {
        if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return null; }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setNombre(data.nombre || '');
        setMensajes(data.mensajes || []);
      })
      .finally(() => setLoading(false));
  }, [authed, adminKey, contacto, canal]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
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
          <Link href="/admin/conversaciones" className="text-[12px] text-gray-400 hover:text-black">← Conversaciones</Link>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto px-4 py-5">
        <div className="mb-4">
          <div className="text-[15px] font-bold text-gray-900">{nombre || contacto}</div>
          <div className="text-[12px] text-gray-400">{contacto} · {canal === 'instagram' ? 'Instagram' : canal === 'whatsapp' ? 'WhatsApp' : canal}</div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando...</div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Sin mensajes guardados</div>
        ) : (
          <div className="flex flex-col gap-3">
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'human' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                  m.rol === 'human' ? 'bg-white border border-gray-200' : 'bg-black text-white'
                }`}>
                  <div className="text-[13px] whitespace-pre-wrap">{m.mensaje}</div>
                  <div className={`text-[10px] mt-1 ${m.rol === 'human' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {fmtDateTime(m.fecha)}
                    {m.estado === 'sin_respuesta' && m.rol !== 'human' && (
                      <span className="ml-1.5 text-orange-400 font-semibold">· sin respuesta / derivado</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
