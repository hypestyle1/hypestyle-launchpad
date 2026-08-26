'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Bandeja de postulaciones para crear contenido. La comparten la content
// manager y la dueña de la cuenta, así que cada decisión queda firmada.

const WP_SECRET_KEY = 'hype_admin_key';

type Estado = 'nuevo' | 'potencial' | 'descartado' | 'aprobado';

type Creador = {
  id: number; nombre: string; email: string; telefono: string; ciudad: string; edad: string;
  instagram: string; tiktok: string; links: string; porque: string; prenda: string;
  frecuencia: string; equipo: string; talle: string; marcas: string;
  tutor_nombre: string; tutor_contacto: string;
  idioma: string; locale: string; idioma_detectado: string; traduccion_estado: string;
  porque_es: string; prenda_es: string; links_es: string; marcas_es: string;
  origen: string; postulado_el: string; plataforma: string; seguidores: string;
  estado: Estado; nota: string; revisadoPor: string; revisadoEl: string; creadoEl: string;
};

const FILTROS: { value: Estado | 'todos'; label: string }[] = [
  { value: 'nuevo', label: 'Sin revisar' },
  { value: 'potencial', label: 'Potenciales' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'descartado', label: 'Descartados' },
  { value: 'todos', label: 'Todos' },
];

const COLOR_ESTADO: Record<Estado, string> = {
  nuevo: 'bg-blue-100 text-blue-700',
  potencial: 'bg-amber-100 text-amber-800',
  aprobado: 'bg-green-100 text-green-700',
  descartado: 'bg-gray-100 text-gray-500',
};

const ETIQUETA: Record<Estado, string> = {
  nuevo: 'Sin revisar', potencial: 'Potencial', aprobado: 'Aprobado', descartado: 'Descartado',
};

function fmtFecha(s: string) {
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function waLink(phone: string, nombre: string) {
  const digits = phone.replace(/\D/g, '');
  const clean = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl = clean.startsWith('54') ? clean : '549' + clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(`Hola ${nombre}, te escribimos de Hype `)}`;
}

export default function CreadoresAdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [autorizado, setAutorizado] = useState(true);
  const [creadores, setCreadores] = useState<Creador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Estado | 'todos'>('nuevo');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<number | null>(null);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  // El equipo lee en español. El original está a un clic, no de entrada.
  const [verOriginal, setVerOriginal] = useState<Set<number>>(new Set());
  const [reintentando, setReintentando] = useState<number | null>(null);
  const [quienSoy, setQuienSoy] = useState<string>('');

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) setAdminKey(stored);
  }, []);

  const headers = useCallback(
    (): Record<string, string> => (adminKey ? { 'Content-Type': 'application/json', 'x-admin-key': adminKey } : { 'Content-Type': 'application/json' }),
    [adminKey],
  );

  // Quién está mirando: se guarda en cada decisión, porque el panel lo
  // comparten dos personas y después importa saber quién dijo que sí.
  useEffect(() => {
    fetch('/api/admin/auth/me', { headers: headers() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setQuienSoy(d.viaSharedKey ? 'clave compartida' : `perfil ${d.id}`); })
      .catch(() => {});
  }, [headers]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/admin/creadores', { headers: headers() });
      if (res.status === 403) { setAutorizado(false); return; }
      if (res.ok) {
        const data = await res.json();
        setCreadores(data.creadores || []);
        setAutorizado(true);
      }
    } finally {
      setCargando(false);
    }
  }, [headers]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return creadores
      .filter(c => filtro === 'todos' || (c.estado || 'nuevo') === filtro)
      .filter(c => !q || [c.nombre, c.email, c.instagram, c.tiktok, c.ciudad].some(v => (v || '').toLowerCase().includes(q)));
  }, [creadores, filtro, busqueda]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { nuevo: 0, potencial: 0, aprobado: 0, descartado: 0, todos: creadores.length };
    creadores.forEach(x => { c[x.estado || 'nuevo'] = (c[x.estado || 'nuevo'] || 0) + 1; });
    return c;
  }, [creadores]);

  async function reintentarTraduccion(c: Creador) {
    setReintentando(c.id);
    try {
      const res = await fetch('/api/admin/creadores/traducir', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ id: c.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreadores(prev => prev.map(x => x.id === c.id ? {
          ...x,
          traduccion_estado: data.estado,
          idioma_detectado: data.idiomaDetectado || x.idioma_detectado,
          porque_es: data.traducciones?.porque ?? x.porque_es,
          prenda_es: data.traducciones?.prenda ?? x.prenda_es,
          links_es: data.traducciones?.links ?? x.links_es,
          marcas_es: data.traducciones?.marcas ?? x.marcas_es,
        } : x));
      } else {
        alert(data.message || 'No se pudo traducir');
      }
    } finally {
      setReintentando(null);
    }
  }

  async function decidir(c: Creador, estado: Estado) {
    setGuardandoId(c.id);
    try {
      const res = await fetch('/api/admin/creadores', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ id: c.id, estado, revisadoPor: quienSoy }),
      });
      if (res.ok) {
        setCreadores(prev => prev.map(x => x.id === c.id ? { ...x, estado, revisadoPor: quienSoy, revisadoEl: new Date().toISOString() } : x));
      }
    } finally {
      setGuardandoId(null);
    }
  }

  if (!autorizado) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 mb-4">Clave de administrador</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); setAutorizado(true); } }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
          />
          <button
            onClick={() => { sessionStorage.setItem(WP_SECRET_KEY, keyInput); setAdminKey(keyInput); setAutorizado(true); }}
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
          <span className="text-[14px] font-semibold text-gray-900">Creadores</span>
          {conteo.nuevo > 0 && (
            <span className="text-[12px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{conteo.nuevo} sin revisar</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                filtro === f.value ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {f.label} <span className="opacity-50">{conteo[f.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, mail, @ o ciudad..."
          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-[13px] mb-5 focus:outline-none focus:border-gray-400"
        />

        {cargando ? (
          <p className="text-center py-20 text-[13px] text-gray-400">Cargando postulaciones...</p>
        ) : visibles.length === 0 ? (
          <p className="text-center py-20 text-[13px] text-gray-400">
            {filtro === 'nuevo' ? 'No hay postulaciones sin revisar.' : 'No hay postulaciones que coincidan.'}
          </p>
        ) : (
          <div className="space-y-3">
            {visibles.map(c => {
              const estado = (c.estado || 'nuevo') as Estado;
              const esMenor = Number(c.edad) > 0 && Number(c.edad) < 18;
              const expandido = abierto === c.id;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[180px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14px] font-semibold text-gray-900">{c.nombre}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${COLOR_ESTADO[estado]}`}>
                            {ETIQUETA[estado]}
                          </span>
                          {esMenor && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Menor · {c.edad}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {[
                            c.ciudad,
                            c.edad && !esMenor ? `${c.edad} años` : '',
                            c.talle ? `talle ${c.talle}` : 'sin talle',
                          ].filter(Boolean).join(' · ')}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px]">
                          {c.instagram && (
                            <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black underline">
                              @{c.instagram}
                            </a>
                          )}
                          {c.tiktok && (
                            <a href={`https://tiktok.com/@${c.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black underline">
                              TikTok @{c.tiktok}
                            </a>
                          )}
                          <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-black">{c.email}</a>
                          {c.telefono && (
                            <a href={waLink(c.telefono, c.nombre)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => decidir(c, 'potencial')}
                          disabled={guardandoId === c.id || estado === 'potencial'}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-30"
                        >
                          Potencial
                        </button>
                        <button
                          onClick={() => decidir(c, 'aprobado')}
                          disabled={guardandoId === c.id || estado === 'aprobado'}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-30"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => decidir(c, 'descartado')}
                          disabled={guardandoId === c.id || estado === 'descartado'}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-gray-300 text-gray-500 hover:text-black disabled:opacity-30"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setAbierto(expandido ? null : c.id)}
                      className="text-[11px] uppercase tracking-wide text-gray-400 hover:text-black mt-3"
                    >
                      {expandido ? 'Ocultar respuestas' : 'Ver respuestas'}
                    </button>
                  </div>

                  {expandido && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4 space-y-3">
                      {(() => {
                        const original = verOriginal.has(c.id);
                        const traducida = c.traduccion_estado === 'ok';
                        const pendiente = c.traduccion_estado === 'pendiente';
                        const texto = (campo: 'porque' | 'prenda' | 'links' | 'marcas') =>
                          traducida && !original ? ((c as any)[campo + '_es'] || (c as any)[campo]) : (c as any)[campo];
                        return (
                          <>
                            {(traducida || pendiente || c.idioma_detectado) && (
                              <div className="flex flex-wrap items-center gap-2 pb-1">
                                {c.idioma_detectado && (
                                  <span className="text-[11px] text-gray-500">
                                    Escrito en <span className="font-medium text-gray-700">{c.idioma_detectado}</span>
                                  </span>
                                )}
                                {traducida && (
                                  <button
                                    onClick={() => setVerOriginal(prev => {
                                      const n = new Set(prev);
                                      if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                                      return n;
                                    })}
                                    className="text-[11px] text-gray-500 hover:text-black underline"
                                  >
                                    {original ? 'Ver traducción' : 'Ver original'}
                                  </button>
                                )}
                                {pendiente && (
                                  <>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                      Traducción pendiente
                                    </span>
                                    <button
                                      onClick={() => reintentarTraduccion(c)}
                                      disabled={reintentando === c.id}
                                      className="text-[11px] text-gray-500 hover:text-black underline disabled:opacity-40"
                                    >
                                      {reintentando === c.id ? 'Traduciendo...' : 'Reintentar'}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            {c.links && <Campo label="Su trabajo" valor={texto('links')} links />}
                            {c.porque && <Campo label="Por qué Hype" valor={texto('porque')} />}
                            {c.prenda && <Campo label="Qué se pondría" valor={texto('prenda')} />}
                          </>
                        );
                      })()}
                      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                        {c.plataforma && <Dato label="Dónde crea" valor={c.plataforma} />}
                        {c.seguidores && <Dato label="Seguidores (declarado)" valor={c.seguidores} />}
                        {c.frecuencia && <Dato label="Puede producir" valor={c.frecuencia} />}
                        {c.equipo && <Dato label="Graba y edita" valor={c.equipo} />}
                        {c.marcas && <Dato label="Marcas previas" valor={(c.traduccion_estado === 'ok' && !verOriginal.has(c.id) && c.marcas_es) || c.marcas} />}
                      </div>
                      {esMenor && c.tutor_nombre && (
                        <div className="text-[12px] bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          <span className="text-amber-900 font-semibold">Adulto responsable:</span>{' '}
                          <span className="text-amber-900">{c.tutor_nombre} — {c.tutor_contacto || 'sin contacto'}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 pt-1">
                        Se postuló el {fmtFecha(c.postulado_el || c.creadoEl)}
                        {c.origen === 'google-form' && ' · del formulario viejo'}
                        {c.revisadoPor && ` · revisada por ${c.revisadoPor}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, valor, links = false }: { label: string; valor: string; links?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      {links ? (
        <div className="text-[13px] text-gray-700 leading-relaxed space-y-0.5">
          {valor.split(/\s+/).filter(Boolean).map((t, i) =>
            /^https?:\/\//.test(t)
              ? <a key={i} href={t} target="_blank" rel="noopener noreferrer" className="block text-blue-700 hover:underline break-all">{t}</a>
              : <span key={i}>{t} </span>,
          )}
        </div>
      ) : (
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{valor}</p>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-[12px] text-gray-700">{valor}</p>
    </div>
  );
}
