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
    `<p style="margin:0 0 18px;font-size:15px;color:#3a3a3a;line-height:1.7;">${p}</p>`
  ).join('');

  const hero = f.image
    ? `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${f.image}" alt="" width="600" style="width:100%;height:auto;display:block;" /></td></tr>` : '';

  const coupon = f.couponCode
    ? `<tr><td style="padding:8px 44px 28px;background:#fff;">
        <div style="background:#0a0a0a;border-radius:10px;padding:22px 24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:0.22em;color:#888;">Código de descuento</p>
          <p style="margin:0 0 8px;font-size:30px;font-weight:800;color:#fff;letter-spacing:0.08em;">${f.couponCode}</p>
          ${f.couponDesc ? `<p style="margin:0;font-size:12px;color:#9a9a9a;">${f.couponDesc}</p>` : ''}
        </div>
      </td></tr>` : '';

  const cta = f.buttonText && f.buttonLink
    ? `<tr><td style="padding:4px 44px 40px;background:#fff;">
        <a href="${f.buttonLink}" style="display:block;background:#0a0a0a;color:#fff;text-decoration:none;padding:17px 32px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;text-align:center;border-radius:10px;">${f.buttonText} &nbsp;&rarr;</a>
      </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 14px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:26px 44px;text-align:center;">
          <img src="${SITE_URL}/logo-hypestyle-2026.png" alt="Hypestyle" width="150" style="height:auto;display:inline-block;" />
        </td></tr>
        ${hero}
        <tr><td style="padding:38px 44px 6px;background:#fff;">
          <p style="margin:0 0 14px;font-size:10px;text-transform:uppercase;letter-spacing:0.26em;color:#b0b0b0;">Style &amp; Culture</p>
          ${f.title ? `<h1 style="margin:0 0 20px;font-size:30px;line-height:1.12;font-weight:800;color:#0a0a0a;letter-spacing:-0.01em;">${f.title}</h1>` : ''}
          ${paragraphs}
        </td></tr>
        ${coupon}
        ${cta}
        <tr><td style="background:#0a0a0a;padding:28px 44px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#fff;letter-spacing:0.04em;">HYPESTYLE</p>
          <p style="margin:0;font-size:12px;color:#8a8a8a;">Seguinos en <a href="https://instagram.com/hypestylearg" style="color:#fff;font-weight:600;text-decoration:none;">@hypestylearg</a></p>
        </td></tr>
      </table>
      <p style="max-width:600px;margin:16px auto 0;font-size:10px;color:#666;text-align:center;line-height:1.5;">Recibís este mail porque estás suscripto a Hypestyle.</p>
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
  const [uploading, setUploading] = useState(false);

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

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', headers: { 'x-admin-key': adminKey }, body: fd });
      const data = await res.json();
      if (data.ok && data.url) {
        setF(prev => ({ ...prev, image: data.url }));
      } else {
        setMsg(`Error al subir: ${data.error || 'desconocido'}`);
      }
    } catch (e: any) {
      setMsg('Error al subir: ' + String(e?.message || e));
    } finally {
      setUploading(false);
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
              <label className="text-[12px] font-medium text-gray-600">Imagen (opcional)</label>
              <div className="flex gap-2">
                <input className={input} value={f.image} onChange={set('image')} placeholder="Pegá una URL o subí un archivo →" />
                <label className={`px-3 py-2 rounded-lg border text-[12px] font-semibold whitespace-nowrap cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {uploading ? 'Subiendo...' : 'Subir'}
                  <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                    onChange={e => { onUpload(e.target.files?.[0] || null); e.target.value = ''; }} />
                </label>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Tip: subí un <b>GIF</b> para que el mail sea animado. Recomendado ancho ≥ 600px.</p>
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
