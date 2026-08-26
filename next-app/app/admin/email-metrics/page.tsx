'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type StepCounts = { step1: number; step2: number; step3: number };

type Campaign = {
  id: number;
  nombre: string;
  asunto: string;
  estado: string;
  fecha: string | null;
  enviados: number; entregados: number; rebotes: number;
  aperturas: number; clicks: number; bajas: number;
  tasa_apertura: number; tasa_click: number;
  compras: number | null; plata: number | null;
};

type Salud = { activa: boolean; ultimo_envio: string | null };

type Metrics = {
  period_days: number;
  campaigns: Campaign[];
  abandoned: Salud & { en_espera: number; sent: StepCounts; recovered_orders: number; recovered_revenue: number; conversion_rate: number };
  welcome:   Salud & { sent: StepCounts; buyers: number; revenue: number; conversion_rate: number };
};

const fmtARS = (n: number) => '$ ' + n.toLocaleString('es-AR');
const fmtPct = (n: number) => (n * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%';
const fmtFecha = (f: string | null) =>
  f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—';

// Días desde la última señal de vida de una secuencia. Un número alto acá es el
// síntoma que antes había que ir a buscar al código.
const diasDesde = (f: string | null) =>
  f ? Math.floor((Date.now() - new Date(f).getTime()) / 86_400_000) : null;

export default function EmailMetricsPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [days, setDays]         = useState(30);
  const [data, setData]         = useState<Metrics | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    setLoading(true); setError('');
    fetch(`/api/admin/email-metrics?days=${days}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.status === 403 ? (setAuthed(false), null) : r.json())
      .then(d => { if (d) setData(d); })
      .catch(e => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [authed, adminKey, days]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput); setAuthed(true);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-gray-500 text-center mb-4">Clave de administrador</p>
          <input type="password" className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-black"
            placeholder="Clave admin" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} autoFocus />
          <button onClick={login} className="w-full bg-black text-white rounded-md py-2 text-[13px] font-semibold hover:bg-gray-900">Entrar</button>
        </div>
      </div>
    );
  }

  const StepBar = ({ label, count, max }: { label: string; count: number; max: number }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[12px] text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-black rounded-full" style={{ width: max ? `${(count / max) * 100}%` : '0%' }} />
      </div>
      <span className="text-[13px] font-semibold text-gray-900 w-10 text-right shrink-0">{count}</span>
    </div>
  );

  return (
    <div className="">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 sticky top-0 z-10">
        <span className="text-[14px] font-semibold text-gray-900">Métricas de email</span>

        <select value={days} onChange={e => setDays(parseInt(e.target.value, 10))}
          className="ml-auto text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-6 space-y-5">
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        {loading && !data && <p className="text-[13px] text-gray-400">Cargando...</p>}

        {data && (
          <>
            {/* ── Campañas (newsletter) ─────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-[14px] font-semibold text-gray-900">Campañas</h2>
                <span className="text-[11px] text-gray-400">últimos envíos</span>
              </div>

              {data.campaigns.length === 0 && (
                <p className="text-[13px] text-gray-400">Todavía no hay campañas enviadas.</p>
              )}

              <div className="overflow-x-auto -mx-5 px-5">
                {data.campaigns.map(c => (
                  <div key={c.id} className="py-3 border-t border-gray-100 first:border-t-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
                      <span className="text-[13px] font-semibold text-gray-900">{c.asunto}</span>
                      <span className="text-[11px] text-gray-400">{fmtFecha(c.fecha)}</span>
                      {c.estado !== 'sent' && (
                        <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                          {c.estado === 'in_review' ? 'en revisión' : c.estado === 'queued' ? 'en cola' : 'enviando'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400">Entregados</p>
                        <p className="text-[15px] font-bold text-gray-900 tabular-nums">{c.entregados.toLocaleString('es-AR')}</p>
                        {c.rebotes > 0 && <p className="text-[10px] text-gray-400">{c.rebotes} rebotes</p>}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Aperturas</p>
                        <p className="text-[15px] font-bold text-gray-900 tabular-nums">{c.aperturas.toLocaleString('es-AR')}</p>
                        <p className="text-[10px] text-gray-500">{fmtPct(c.tasa_apertura)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Clics</p>
                        <p className="text-[15px] font-bold text-gray-900 tabular-nums">{c.clicks.toLocaleString('es-AR')}</p>
                        <p className="text-[10px] text-gray-500">{fmtPct(c.tasa_click)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Compras</p>
                        <p className="text-[15px] font-bold text-gray-900 tabular-nums">{c.compras === null ? '—' : c.compras}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Plata</p>
                        <p className="text-[15px] font-bold text-green-600 tabular-nums">{c.plata === null ? '—' : fmtARS(c.plata)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Bajas</p>
                        <p className="text-[15px] font-bold text-gray-900 tabular-nums">{c.bajas}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 mt-3">
                Compras: pedidos pagos de gente de la lista dentro de las 72 h del envío. Es atribución
                por contacto, no causalidad — no sumarla al ROAS de Meta o se cuenta la venta dos veces.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-gray-900">Carrito abandonado</h2>
                  <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${
                    data.abandoned.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.abandoned.activa ? 'activa' : 'apagada'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">últimos {data.period_days} días</span>
              </div>

              {(!data.abandoned.activa || data.abandoned.en_espera > 0) && (
                <p className="text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
                  {data.abandoned.en_espera > 0
                    ? <><b>{data.abandoned.en_espera}</b> pedidos sin pagar esperando el mail. </>
                    : null}
                  {data.abandoned.ultimo_envio
                    ? <>Último envío hace {diasDesde(data.abandoned.ultimo_envio)} días.</>
                    : <>Sin ningún envío en el período.</>}
                  {!data.abandoned.activa && <> La secuencia está apagada: falta <code>ABANDONED_ENABLED=true</code> en Vercel.</>}
                </p>
              )}
              <div className="space-y-2.5 mb-5">
                <StepBar label="Step 1" count={data.abandoned.sent.step1} max={data.abandoned.sent.step1} />
                <StepBar label="Step 2" count={data.abandoned.sent.step2} max={data.abandoned.sent.step1} />
                <StepBar label="Step 3" count={data.abandoned.sent.step3} max={data.abandoned.sent.step1} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400">Pedidos recuperados</p>
                  <p className="text-[18px] font-bold text-gray-900">{data.abandoned.recovered_orders}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Plata recuperada</p>
                  <p className="text-[18px] font-bold text-green-600">{fmtARS(data.abandoned.recovered_revenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Conversión</p>
                  <p className="text-[18px] font-bold text-gray-900">{fmtPct(data.abandoned.conversion_rate)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-gray-900">Bienvenida</h2>
                  <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${
                    data.welcome.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.welcome.activa ? 'activa' : 'apagada'}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">suscriptos en los últimos {data.period_days} días</span>
              </div>

              {!data.welcome.activa && (
                <p className="text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
                  El paso 1 lo manda el alta al suscribirse, así que sigue saliendo. Los pasos 2 y 3
                  dependen del cron y están apagados: falta <code>WELCOME_SEQUENCE_ENABLED=true</code> en Vercel.
                </p>
              )}
              <div className="space-y-2.5 mb-5">
                <StepBar label="Step 1" count={data.welcome.sent.step1} max={data.welcome.sent.step1} />
                <StepBar label="Step 2" count={data.welcome.sent.step2} max={data.welcome.sent.step1} />
                <StepBar label="Step 3" count={data.welcome.sent.step3} max={data.welcome.sent.step1} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400">Compraron</p>
                  <p className="text-[18px] font-bold text-gray-900">{data.welcome.buyers}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Plata generada</p>
                  <p className="text-[18px] font-bold text-green-600">{fmtARS(data.welcome.revenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Conversión</p>
                  <p className="text-[18px] font-bold text-gray-900">{fmtPct(data.welcome.conversion_rate)}</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 px-1">
              Aperturas y clicks por paso: Brevo → Statistics → Transactional, filtrando por tag
              (<code>abandoned-step-1/2/3</code>, <code>welcome-step-1/2/3</code>).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
