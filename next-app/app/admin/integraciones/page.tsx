'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtRelative } from '@/lib/admin-format';
import { StatusBadge, type BadgeTone } from '@/components/admin/ui';
import type { MetaConnection } from '@/lib/meta/connection';

const STATE: Record<string, { label: string; tone: BadgeTone }> = {
  connected: { label: 'Conectado', tone: 'success' },
  stale: { label: 'Datos en caché', tone: 'warning' },
  error: { label: 'Error temporal', tone: 'warning' },
  disconnected: { label: 'No conectado', tone: 'neutral' },
};

function maskAccount(id: string): string {
  const n = id.replace(/^act_/, '');
  return n.length > 4 ? `act_…${n.slice(-4)}` : id;
}

export default function IntegracionesPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [meta, setMeta] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    if (!puede('costos')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/meta/status${refresh ? '?refresh=1' : ''}`, { headers: headers() });
      if (res.ok) setMeta(await res.json());
    } finally { setLoading(false); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin"
            onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }

  const st = meta ? (STATE[meta.state] || STATE.disconnected) : null;
  const rows: [string, string][] = meta && meta.account ? [
    ['Cuenta', meta.account.name],
    ['Ad Account', maskAccount(meta.account.id)],
    ['Moneda', meta.account.currency],
    ['Timezone', meta.account.timezone],
    ['API version', meta.apiVersion],
    ['Última sync', meta.lastSync ? (fmtRelative(meta.lastSync) || '—') : '—'],
  ] : [];

  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Integraciones</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Servicios conectados al panel. Las credenciales se administran de forma segura en el servidor.</p>
        </div>
        <button onClick={() => load(true)} title="Actualizar" className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-mid transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!puede('costos') ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-muted-foreground">Sin acceso a esta sección.</div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-[15px] font-bold text-foreground">M</div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Meta Ads</p>
                <p className="text-[12px] text-muted-foreground">Marketing API · read-only</p>
              </div>
            </div>
            {st ? <StatusBadge tone={st.tone}>{st.label}</StatusBadge> : <span className="h-5 w-20 bg-muted/60 rounded-full animate-pulse" />}
          </div>

          {meta && meta.state === 'disconnected' && meta.reason === 'not_configured' ? (
            <p className="text-[12.5px] text-muted-foreground">
              Falta <code className="bg-muted px-1 rounded">META_ACCESS_TOKEN</code> (system user, read-only) en el servidor. Se configura en Vercel, nunca en el browser.
            </p>
          ) : meta && meta.state === 'disconnected' && meta.reason === 'auth' ? (
            <p className="text-[12.5px] text-warning">El token de Meta fue rechazado (auth/permiso). Revisá que siga vigente en Vercel.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-[12px] text-muted-foreground">{k}</span>
                  <span className="text-[12.5px] text-foreground tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/70 mt-4 pt-3 border-t border-border">
            Credenciales administradas de forma segura en el servidor (Vercel). El token nunca llega al navegador. Read-only: no puede pausar, editar ni crear campañas.
          </p>
        </div>
      )}
    </div>
  );
}
