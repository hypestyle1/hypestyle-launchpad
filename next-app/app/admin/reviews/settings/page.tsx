'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WP_SECRET_KEY = 'hype_admin_key';

type Settings = {
  system_enabled: boolean;
  test_mode: boolean;
  test_allowlist: string;
  dispatch_on_tracking: boolean;
  delay_days: number;
  token_expiry_days: number;
  request_email_enabled: boolean;
  subject: string;
  heading: string;
  additional_content: string;
  button_text: string;
  confirmation_email_enabled: boolean;
  incentive_enabled: boolean;
  incentive_type: string;
  incentive_value: number;
  incentive_expiry_days: number;
  incentive_min_amount: number;
  incentive_individual_use: boolean;
  incentive_exclude_sale_items: boolean;
};

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 rounded border-border-mid cursor-pointer" />
      <div>
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground/70">{hint}</div>}
      </div>
    </label>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="py-2">
      <label className="block text-[12px] font-medium text-foreground/80 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full border border-border rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';

export default function ReviewsSettingsPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey) return;
    setLoading(true);
    fetch('/api/admin/reviews/settings', { headers: { 'x-admin-key': adminKey } })
      .then(r => { if (r.status === 403) { setAuthed(false); return null; } return r.json(); })
      .then(data => { if (data) setSettings(data); })
      .finally(() => setLoading(false));
  }, [authed, adminKey]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function save() {
    if (!settings || saving) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/reviews/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { setMsg('No se pudo guardar la configuración.'); return; }
      setMsg('✓ Configuración guardada.');
    } catch {
      setMsg('Error al conectar.');
    } finally {
      setSaving(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 w-full max-w-sm">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6" />
          <p className="text-[13px] text-muted-foreground text-center mb-4">Clave de administrador</p>
          <input
            type="password"
            className="w-full border border-border-mid rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring"
            placeholder="Clave admin"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          <button onClick={login} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold hover:opacity-90">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (loading || !settings) {
    return <div className="min-h-screen flex items-center justify-center text-[13px] text-muted-foreground/70">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/reviews" className="text-[12px] text-muted-foreground/70 hover:text-foreground">← Reseñas</Link>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-[14px] font-semibold text-foreground">Configuración</span>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="text-[12px] font-semibold px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="max-w-[720px] mx-auto px-4 py-5 space-y-4">
        {msg && (
          <div className={`px-3 py-2 rounded-lg text-[12px] ${msg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </div>
        )}

        <div className="bg-card rounded-lg border border-border px-5 py-4">
          <h2 className="text-[13px] font-semibold text-foreground mb-1">Sistema</h2>
          <Toggle
            checked={settings.system_enabled}
            onChange={v => set('system_enabled', v)}
            label="Sistema de reseñas activado"
            hint="Apagado: ninguna orden despachada programa un email, sin importar el resto de la configuración."
          />
          <Toggle
            checked={settings.test_mode}
            onChange={v => set('test_mode', v)}
            label="Modo test"
            hint="Recomendado prendido durante el rollout inicial: solo procesa órdenes cuyo email o ID de orden esté en la lista de abajo."
          />
          {settings.test_mode && (
            <Field label="Emails o IDs de orden autorizados para pruebas" hint="Separados por coma. Ej: tu-email@hypestyle.com.ar, 1847">
              <input type="text" className={inputCls} value={settings.test_allowlist} onChange={e => set('test_allowlist', e.target.value)} placeholder="email@ejemplo.com, 1234" />
            </Field>
          )}
          <Toggle
            checked={settings.dispatch_on_tracking}
            onChange={v => set('dispatch_on_tracking', v)}
            label="Tracking como fallback de despacho"
            hint="Apagado por defecto. Si se prende, la primera guía de Andreani cargada también dispara el despacho, además del botón manual."
          />
        </div>

        <div className="bg-card rounded-lg border border-border px-5 py-4">
          <h2 className="text-[13px] font-semibold text-foreground mb-1">Email de solicitud</h2>
          <Toggle checked={settings.request_email_enabled} onChange={v => set('request_email_enabled', v)} label="Email de solicitud activado" />
          <Field label="Días de espera después del despacho">
            <input type="number" min={1} max={60} className={inputCls} value={settings.delay_days} onChange={e => set('delay_days', Number(e.target.value))} />
          </Field>
          <Field label="Duración del link (días)">
            <input type="number" min={1} max={90} className={inputCls} value={settings.token_expiry_days} onChange={e => set('token_expiry_days', Number(e.target.value))} />
          </Field>
          <Field label="Asunto">
            <input type="text" className={inputCls} value={settings.subject} onChange={e => set('subject', e.target.value)} placeholder="¿Qué te pareció tu compra en {site_title}?" />
          </Field>
          <Field label="Encabezado">
            <input type="text" className={inputCls} value={settings.heading} onChange={e => set('heading', e.target.value)} placeholder="Contanos qué te pareció" />
          </Field>
          <Field label="Texto principal">
            <textarea className={inputCls} rows={3} value={settings.additional_content} onChange={e => set('additional_content', e.target.value)} />
          </Field>
          <Field label="Texto del botón">
            <input type="text" className={inputCls} value={settings.button_text} onChange={e => set('button_text', e.target.value)} placeholder="Dejar mi reseña" />
          </Field>
        </div>

        <div className="bg-card rounded-lg border border-border px-5 py-4">
          <h2 className="text-[13px] font-semibold text-foreground mb-1">Email de confirmación</h2>
          <Toggle checked={settings.confirmation_email_enabled} onChange={v => set('confirmation_email_enabled', v)} label="Email de confirmación + cupón activado" />
        </div>

        <div className="bg-card rounded-lg border border-border px-5 py-4">
          <h2 className="text-[13px] font-semibold text-foreground mb-1">Beneficio</h2>
          <Toggle checked={settings.incentive_enabled} onChange={v => set('incentive_enabled', v)} label="Beneficio activado" hint="Se entrega por dejar una reseña válida, sin importar el rating." />
          <Field label="Tipo de beneficio">
            <select className={inputCls} value={settings.incentive_type} disabled>
              <option value="percent">Porcentaje</option>
            </select>
          </Field>
          <Field label="Porcentaje de descuento">
            <input type="number" min={1} max={90} className={inputCls} value={settings.incentive_value} onChange={e => set('incentive_value', Number(e.target.value))} />
          </Field>
          <Field label="Días de validez del cupón" hint="0 = sin vencimiento.">
            <input type="number" min={0} max={365} className={inputCls} value={settings.incentive_expiry_days} onChange={e => set('incentive_expiry_days', Number(e.target.value))} />
          </Field>
          <Field label="Monto mínimo de compra" hint="0 = sin mínimo.">
            <input type="number" min={0} className={inputCls} value={settings.incentive_min_amount} onChange={e => set('incentive_min_amount', Number(e.target.value))} />
          </Field>
          <Toggle checked={settings.incentive_individual_use} onChange={v => set('incentive_individual_use', v)} label="Uso individual" hint="No permite combinar el cupón con otros cupones." />
          <Toggle checked={settings.incentive_exclude_sale_items} onChange={v => set('incentive_exclude_sale_items', v)} label="Excluir productos en oferta" />
        </div>

        <p className="text-[11px] text-muted-foreground/70 px-1">
          El secreto de la API (HS_REVIEWS_SECRET) no se muestra ni se administra acá — se rota exclusivamente desde WooCommerce → Solicitudes de reseñas en wp-admin, para que nunca sea legible desde el navegador.
        </p>
      </div>
    </div>
  );
}
