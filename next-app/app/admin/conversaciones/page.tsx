'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type Conversacion = {
  canal: string;
  contacto: string;
  nombre: string;
  ultimo_mensaje: string;
  ultimo_rol: string;
  estado: string;
  fecha: string;
};

const ESTADO_LABELS: Record<string, string> = {
  respondido: 'Respondido',
  sin_respuesta: 'Sin respuesta / derivado',
};

const ESTADO_COLORS: Record<string, string> = {
  respondido: 'bg-green-100 text-green-700',
  sin_respuesta: 'bg-orange-100 text-orange-800',
};

const CANAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

function fmtDate(s: string) {
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
       + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversacionesPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [items, setItems]       = useState<Conversacion[]>([]);
  const [loading, setLoading]   = useState(false);
  const [canalFilter, setCanalFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const perPage = 30;

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  const fetchConversaciones = useCallback(async (key: string, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conversaciones?page=${p}&per_page=${perPage}`, {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 403) { setAuthed(false); sessionStorage.removeItem(WP_SECRET_KEY); return; }
      const data = await res.json();
      setItems(data.conversaciones || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && adminKey) fetchConversaciones(adminKey, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, adminKey, page]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  const visible = items.filter(c =>
    (canalFilter === 'todos' || c.canal === canalFilter) &&
    (estadoFilter === 'todos' || c.estado === estadoFilter)
  );
  const totalPages = Math.max(1, Math.ceil(total / perPage));

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
    <div className="">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[14px] font-semibold text-gray-900">Conversaciones del bot</span>
          {total > 0 && <span className="text-[12px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>}
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(WP_SECRET_KEY); setAuthed(false); setAdminKey(''); }}
          className="text-[11px] text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Salir
        </button>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-5">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {['todos', 'instagram', 'whatsapp'].map(f => (
              <button
                key={f}
                onClick={() => setCanalFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  canalFilter === f ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                {f === 'todos' ? 'Todos los canales' : CANAL_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {['todos', 'respondido', 'sin_respuesta'].map(f => (
              <button
                key={f}
                onClick={() => setEstadoFilter(f)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  estadoFilter === f ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                }`}
              >
                {f === 'todos' ? 'Todos los estados' : ESTADO_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[13px] text-gray-400">Cargando conversaciones...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-[13px] text-gray-400">No hay conversaciones</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[90px_1fr_2fr_140px_120px] gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Canal</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contacto</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Último mensaje</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Estado</div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Fecha</div>
            </div>

            {visible.map((c, idx) => (
              <Link
                key={c.canal + ':' + c.contacto}
                href={`/admin/conversaciones/${c.contacto}?canal=${c.canal}`}
                className={`grid grid-cols-[90px_1fr_2fr_140px_120px] gap-3 px-4 py-3 items-center border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  idx === visible.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="text-[12px] text-gray-600">{CANAL_LABELS[c.canal] || c.canal}</div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-gray-900 truncate">{c.nombre || c.contacto}</div>
                  <div className="text-[11px] text-gray-400 truncate">{c.contacto}</div>
                </div>
                <div className="min-w-0 text-[12px] text-gray-500 truncate">
                  <span className="text-gray-400">{c.ultimo_rol === 'human' ? 'Cliente: ' : 'Bot: '}</span>
                  {c.ultimo_mensaje}
                </div>
                <div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[c.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADO_LABELS[c.estado] || c.estado}
                  </span>
                </div>
                <div className="text-right text-[11px] text-gray-400">{fmtDate(c.fecha)}</div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-[12px] text-gray-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
