'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { uniqueEmails, type StockAlertsSnapshot, type StockAlertGroup } from '@/lib/stock-alerts';

// Avisos de stock: quién pidió que le avisen cuando vuelva un talle agotado.
// Sirve para dos cosas: medir la demanda antes de reponer y tener la lista a
// mano el día que entra el stock. El panel no manda mails: copia la lista y
// marca a quién ya se le escribió.

const clave = (g: { slug: string; size: string }) => `${g.slug}|${g.size}`;

function fecha(iso: string): string {
  // El mu-plugin guarda en UTC sin zona.
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}

export default function AvisosStockPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [snap, setSnap] = useState<StockAlertsSnapshot | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const load = useCallback(async () => {
    if (!puede('pedidos')) return;
    setCargando(true);
    try {
      const res = await fetch('/api/admin/stock-alerts?status=pending', { headers: headers(), cache: 'no-store' });
      const data = await res.json();
      if (res.ok) { setSnap(data.snapshot); setMsg(null); }
      else setMsg({ tipo: 'error', texto: data.error || 'No se pudieron leer los avisos.' });
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al conectar.' });
    } finally { setCargando(false); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

  const filasDe = useCallback(
    (g: StockAlertGroup) => (snap?.rows || []).filter(r => r.slug === g.slug && r.size === g.size),
    [snap],
  );

  const porProducto = useMemo(() => {
    const totales = new Map<string, { name: string; count: number }>();
    for (const g of snap?.groups || []) {
      const t = totales.get(g.slug) || { name: g.name || g.slug, count: 0 };
      t.count += g.count;
      totales.set(g.slug, t);
    }
    return [...totales.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [snap]);

  async function accion(body: Record<string, unknown>, okTexto: string) {
    setOcupado(true);
    try {
      const res = await fetch('/api/admin/stock-alerts', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) { await load(); setMsg({ tipo: 'ok', texto: okTexto }); }
      else setMsg({ tipo: 'error', texto: data.error || 'No se pudo guardar.' });
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al conectar.' });
    } finally { setOcupado(false); }
  }

  async function copiar(g: StockAlertGroup) {
    const mails = uniqueEmails(filasDe(g));
    try {
      await navigator.clipboard.writeText(mails.join(', '));
      setMsg({ tipo: 'ok', texto: `${mails.length} mails copiados.` });
    } catch {
      setMsg({ tipo: 'error', texto: 'No se pudo copiar. Abrí el detalle y copialos a mano.' });
    }
  }

  function marcar(g: StockAlertGroup) {
    if (!window.confirm(`¿Marcar como avisadas a las ${g.count} personas de ${g.name || g.slug} talle ${g.size}? Salen de esta lista.`)) return;
    accion({ action: 'mark', slug: g.slug, size: g.size, status: 'notified' }, 'Marcados como avisados.');
  }

  function borrar(id: number, email: string) {
    if (!window.confirm(`¿Borrar el aviso de ${email}? No se puede deshacer.`)) return;
    accion({ action: 'delete', id }, 'Aviso borrado.');
  }

  if (autorizado === false) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="bg-card rounded-lg border border-border p-8 w-full max-w-sm text-center">
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Clave admin"
            onKeyDown={e => { if (e.key === 'Enter') ingresarConClave(keyInput); }}
            className="w-full border border-border-mid bg-card text-foreground rounded-md px-3 py-2 text-[13px] mb-3" />
          <button onClick={() => ingresarConClave(keyInput)} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-[13px] font-semibold">Entrar</button>
        </div>
      </div>
    );
  }
  if (!puede('pedidos')) return <div className="p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Avisos de stock.</div>;

  const total = snap?.rows.length ?? 0;

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Avisos de stock</h1>
        <button onClick={load} disabled={cargando || ocupado} title="Volver a leer"
          className="h-9 w-9 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
          <RotateCcw size={15} />
        </button>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Personas que pidieron que les avisen cuando vuelva un talle agotado. El panel no manda mails: copiá la lista,
        escribiles y después marcalos como avisados.
      </p>
      {msg && (
        <p className={`text-[12px] mt-2 ${msg.tipo === 'ok' ? 'text-success' : 'text-warning'}`}>{msg.texto}</p>
      )}

      {cargando && !snap && <p className="mt-8 text-center text-[13px] text-muted-foreground">Cargando…</p>}

      {snap && total === 0 && (
        <p className="mt-8 text-center text-[13px] text-muted-foreground">Todavía no hay avisos pendientes.</p>
      )}

      {snap && total > 0 && (
        <>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground mt-8 mb-1">Por producto</h2>
          <p className="text-[12px] text-muted-foreground mb-3">
            {total} avisos pendientes en {porProducto.length} productos.
          </p>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-border">
                {porProducto.map(([slug, p]) => (
                  <tr key={slug}>
                    <td className="px-4 py-2.5 text-foreground">{p.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground w-[80px]">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground mt-8 mb-1">Por talle</h2>
          <p className="text-[12px] text-muted-foreground mb-3">De más pedido a menos pedido.</p>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">Producto</th>
                  <th className="text-left font-medium px-2 py-2.5 w-[70px]">Talle</th>
                  <th className="text-right font-medium px-2 py-2.5 w-[80px]">Personas</th>
                  <th className="text-left font-medium px-2 py-2.5 w-[80px]">Último</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snap.groups.map(g => {
                  const k = clave(g);
                  const filas = abierto === k ? filasDe(g) : [];
                  return (
                    <Grupo key={k}
                      g={g} filas={filas} abierto={abierto === k} ocupado={ocupado}
                      onToggle={() => setAbierto(abierto === k ? null : k)}
                      onCopiar={() => copiar(g)} onMarcar={() => marcar(g)} onBorrar={borrar}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Grupo({ g, filas, abierto, ocupado, onToggle, onCopiar, onMarcar, onBorrar }: {
  g: StockAlertGroup;
  filas: StockAlertsSnapshot['rows'];
  abierto: boolean;
  ocupado: boolean;
  onToggle: () => void;
  onCopiar: () => void;
  onMarcar: () => void;
  onBorrar: (id: number, email: string) => void;
}) {
  const boton = 'h-8 px-3 rounded-md border border-border text-[12px] text-foreground hover:bg-muted disabled:opacity-50';
  return (
    <>
      <tr>
        <td className="px-4 py-2.5 text-foreground">
          <a href={`/producto/${g.slug}/`} target="_blank" rel="noreferrer" className="hover:underline">{g.name || g.slug}</a>
        </td>
        <td className="px-2 py-2.5 text-foreground font-medium">{g.size}</td>
        <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-foreground">{g.count}</td>
        <td className="px-2 py-2.5 text-muted-foreground tabular-nums">{fecha(g.lastAt)}</td>
        <td className="px-4 py-2.5">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onToggle} aria-expanded={abierto} className={boton}>{abierto ? 'Cerrar' : 'Ver'}</button>
            <button onClick={onCopiar} className={boton}>Copiar mails</button>
            <button onClick={onMarcar} disabled={ocupado} className={boton}>Marcar avisados</button>
          </div>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-muted/40">
          <td colSpan={5} className="px-4 py-3">
            <ul className="space-y-1.5">
              {filas.map(r => (
                <li key={r.id} className="flex items-center gap-3 text-[12px]">
                  <span className="text-foreground break-all">{r.email}</span>
                  {r.phone && <span className="text-muted-foreground tabular-nums">{r.phone}</span>}
                  <span className="text-muted-foreground/70 tabular-nums">{fecha(r.createdAt)}</span>
                  {r.lang !== 'ES' && <span className="text-muted-foreground/70">{r.lang}</span>}
                  <button onClick={() => onBorrar(r.id, r.email)} disabled={ocupado}
                    className="ml-auto text-muted-foreground hover:text-foreground underline disabled:opacity-50">
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
