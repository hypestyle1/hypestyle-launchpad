'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';
const SITE_URL = 'https://hypestyle.com.ar';

type Fields = {
  subject: string;
  title: string;
  body: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  couponCode: string;
  couponDesc: string;
};

const EMPTY: Fields = {
  subject: '', title: '', body: '', image: '',
  buttonText: 'Ver la tienda', buttonLink: SITE_URL,
  couponCode: '', couponDesc: '',
};

function buildHtml(f: Fields) {
  const paragraphs = f.body.split('\n').filter(Boolean).map(p =>
    `<p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">${p}</p>`
  ).join('');

  const hero = f.image
    ? `<tr><td style="padding:0;"><img src="${f.image}" alt="" width="560" style="width:100%;height:auto;display:block;" /></td></tr>` : '';

  const coupon = f.couponCode
    ? `<tr><td style="padding:0 40px 28px;background:#fff;">
        <div style="background:#f8f8f8;border:1px dashed #ccc;border-radius:6px;padding:20px 24px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#999;">Tu código de descuento</p>
          <p style="margin:0 0 10px;font-size:28px;font-weight:800;color:#111;letter-spacing:0.06em;">${f.couponCode}</p>
          ${f.couponDesc ? `<p style="margin:0;font-size:12px;color:#888;">${f.couponDesc}</p>` : ''}
        </div>
      </td></tr>` : '';

  const cta = f.buttonText && f.buttonLink
    ? `<tr><td style="padding:0 40px 32px;background:#fff;">
        <a href="${f.buttonLink}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:14px 32px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${f.buttonText}</a>
      </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:24px 40px;text-align:center;">
          <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="130" style="height:auto;display:inline-block;" />
        </td></tr>
        ${hero}
        <tr><td style="padding:32px 40px 8px;background:#fff;">
          ${f.title ? `<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111;">${f.title}</h1>` : ''}
          ${paragraphs}
        </td></tr>
        ${coupon}
        ${cta}
        <tr><td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;color:#999;">Hypestyle · <a href="https://instagram.com/hypestylearg" style="color:#111;font-weight:600;">@hypestylearg</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default function NewsletterPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [f, setF]               = useState<Fields>(EMPTY);
  const [count, setCount]       = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [msg, setMsg]           = useState('');
  const [sending, setSending]   = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    fetch('/api/admin/newsletter', { headers: { 'x-admin-key': adminKey } })
      .then(r => r.status === 403 ? (setAuthed(false), null) : r.json())
      .then(d => d && setCount(d.count ?? 0))
      .catch(() => {});
  }, [authed, adminKey]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput); setAuthed(true);
  }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const html = buildHtml(f);
  const canSend = f.subject.trim() && f.title.trim() && f.body.trim();

  async function send(test?: string) {
    setSending(true); setMsg('');
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ subject: f.subject, html, ...(test ? { test } : {}) }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(test ? `✓ Prueba enviada a ${test}` : `✓ Campaña enviada a la lista (${count ?? '...'} suscriptores)`);
        setConfirmSend(false);
      } else {
        setMsg(`Error: ${data.error || 'desconocido'}`);
      }
    } catch (e: any) {
      setMsg('Error: ' + String(e?.message || e));
    } finally {
      setSending(false);
    }
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

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gray-400";

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-6 w-auto" />
        <span className="text-gray-300">|</span>
        <span className="text-[14px] font-semibold text-gray-900">Newsletter</span>
        <Link href="/admin/pedidos" className="text-[12px] text-gray-400 hover:text-black ml-2">Pedidos →</Link>
        {count !== null && <span className="ml-auto text-[12px] text-gray-500">{count} suscriptores</span>}
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composer */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-[12px] font-medium text-gray-600">Asunto del email</label>
              <input className={input} value={f.subject} onChange={set('subject')} placeholder="Nuevo drop FW26 ya disponible" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-gray-600">Título</label>
              <input className={input} value={f.title} onChange={set('title')} placeholder="Llegó el drop que estabas esperando" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-gray-600">Texto</label>
              <textarea className={input + ' resize-y'} rows={4} value={f.body} onChange={set('body')} placeholder="Escribí el cuerpo. Cada línea es un párrafo." />
            </div>
            <div>
              <label className="text-[12px] font-medium text-gray-600">Imagen (URL, opcional)</label>
              <input className={input} value={f.image} onChange={set('image')} placeholder="https://hypestyle.com.ar/..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-gray-600">Texto del botón</label>
                <input className={input} value={f.buttonText} onChange={set('buttonText')} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600">Link del botón</label>
                <input className={input} value={f.buttonLink} onChange={set('buttonLink')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-gray-600">Código descuento (opcional)</label>
                <input className={input} value={f.couponCode} onChange={set('couponCode')} placeholder="HYPE15" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600">Detalle del código</label>
                <input className={input} value={f.couponDesc} onChange={set('couponDesc')} placeholder="15% off · válido 48hs" />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex gap-2">
              <input className={input} value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="tu@email.com (prueba)" />
              <button onClick={() => send(testEmail)} disabled={!canSend || !testEmail || sending}
                className="px-3 py-2 rounded-lg border border-gray-300 text-[12px] font-semibold whitespace-nowrap hover:bg-gray-50 disabled:opacity-50">
                Enviar prueba
              </button>
            </div>
            <button onClick={() => setConfirmSend(true)} disabled={!canSend || sending}
              className="w-full py-2.5 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-gray-800 disabled:opacity-50">
              Enviar a todos los suscriptores{count !== null ? ` (${count})` : ''}
            </button>
            {!canSend && <p className="text-[11px] text-gray-400">Completá asunto, título y texto para habilitar el envío.</p>}
            {msg && <p className={`text-[12px] ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 text-[12px] font-medium text-gray-500">Vista previa</div>
          <iframe srcDoc={html} title="preview" className="w-full h-[640px] bg-[#f5f5f5]" />
        </div>
      </div>

      {/* Confirm modal */}
      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !sending && setConfirmSend(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-gray-900">Enviar campaña</h3>
            <p className="text-[13px] text-gray-500 mt-1">
              Se enviará <b>&quot;{f.subject}&quot;</b> a <b>{count ?? '...'} suscriptores</b>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirmSend(false)} disabled={sending} className="flex-1 py-2 rounded-lg border border-gray-200 text-[13px] font-medium hover:bg-gray-50 disabled:opacity-50">Volver</button>
              <button onClick={() => send()} disabled={sending} className="flex-1 py-2 rounded-lg bg-black text-white text-[13px] font-semibold hover:bg-gray-800 disabled:opacity-50">
                {sending ? 'Enviando...' : 'Enviar ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
