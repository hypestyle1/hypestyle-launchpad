'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileStack } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { type Template, blankTemplate } from '@/lib/workflow/types';
import { CHANNEL_LABEL, FORMAT_LABEL, PILLAR_LABEL } from '@/lib/content/types';
import { TemplateDrawer } from '@/components/admin/TemplateDrawer';

export default function TemplatesPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [items, setItems] = useState<Template[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'notdeployed'>('loading');
  const [responsibles, setResponsibles] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Partial<Template> | null>(null);

  const load = useCallback(async () => {
    if (!puede('creadores')) return;
    setState('loading');
    try {
      const res = await fetch('/api/admin/templates', { headers: headers() });
      const d = await res.json();
      if (d.notDeployed) { setState('notdeployed'); setItems([]); return; }
      if (!res.ok) throw new Error();
      setItems(d.items || []); setState('ok');
    } catch { setState('error'); }
  }, [headers, puede]);
  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);
  useEffect(() => { if (autorizado) fetch('/api/admin/content/refs', { headers: headers() }).then((r) => r.ok ? r.json() : null).then((d) => d && setResponsibles(d.responsibles || [])).catch(() => {}); }, [autorizado, headers]);

  async function saveTemplate(patch: Partial<Template>, id?: string) {
    const url = id ? `/api/admin/templates/${id}` : '/api/admin/templates';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify(patch) });
    if (res.status === 501) { alert((await res.json()).error); return false; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Error'); return false; }
    await load(); return true;
  }
  async function delTemplate(id: string) { if (!confirm('¿Borrar este template?')) return; await fetch(`/api/admin/templates/${id}`, { method: 'DELETE', headers: headers() }); setEdit(null); load(); }

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-7 w-auto mx-auto mb-6 dark:invert" />
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Clave admin" onKeyDown={(e) => { if (e.key === 'Enter') ingresarConClave(keyInput); }} className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-ring" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6">
      <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"><ArrowLeft size={14} /> Contenido</Link>
      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Templates</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Puntos de partida para crear contenido más rápido.</p>
        </div>
        <button onClick={() => setEdit(blankTemplate())} className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5"><Plus size={14} /> Nuevo template</button>
      </div>

      {state === 'notdeployed' ? <div className="bg-warning-soft text-warning rounded-lg p-4 text-[13px]">El backend 04C (PHP 1.26.0) todavía no está desplegado.</div>
        : state === 'error' ? <div className="bg-card border border-border rounded-lg p-8 text-center text-[13px] text-destructive">No se pudieron cargar. Reintentá.</div>
        : !items ? <div className="h-[240px] bg-muted/40 rounded-lg animate-pulse" />
        : items.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-14 text-center">
            <FileStack size={26} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-[14px] font-semibold text-foreground">Sin templates.</p>
            <p className="text-[12.5px] text-muted-foreground mt-1">{'Creá «Reel Producto», «UGC Creator», «Newsletter Drop»…'}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((t) => (
              <button key={t.id} onClick={() => setEdit(t)} className="text-left bg-card border border-border rounded-lg p-3 hover:border-border-mid">
                <p className="text-[13.5px] font-semibold text-foreground">{t.name}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{CHANNEL_LABEL[t.channel]} · {FORMAT_LABEL[t.format]}{t.contentPillar ? ` · ${PILLAR_LABEL[t.contentPillar]}` : ''}</p>
                {(t.checklist?.length ?? 0) > 0 && <p className="text-[11px] text-muted-foreground/70 mt-1">{t.checklist!.length} ítems de checklist</p>}
              </button>
            ))}
          </div>
        )}

      {edit && <TemplateDrawer initial={edit} responsibles={responsibles} onClose={() => setEdit(null)} onSave={saveTemplate} onDelete={delTemplate} />}
    </div>
  );
}
