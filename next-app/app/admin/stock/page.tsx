'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { COLOR_LABEL, buildPoolsPayload, type SharedStockSnapshot, type SharedStockProduct } from '@/lib/shared-stock';

// Stock compartido de las Regular Tees. Doce entradas de Woo se sirven de
// cuatro pilas físicas de color: acá se cargan las unidades que hay en depósito
// y el mu-plugin recalcula los packs. Los packs no se editan a mano.

type Borrador = Record<string, Record<string, string>>;

/** Colores de la receta que hoy limitan ese talle. Sólo para mostrar el porqué. */
function cuellos(prod: SharedStockProduct, snap: SharedStockSnapshot, talle: string): string[] {
  const posibles = Object.entries(prod.recipe).map(([color, porUnidad]) => {
    const pila = snap.pools.find(p => p.color === color)?.stock[talle];
    if (pila === null || pila === undefined) return { color, cuantos: Infinity };
    return { color, cuantos: Math.floor(Math.max(0, pila) / Math.max(1, porUnidad)) };
  });
  const min = Math.min(...posibles.map(p => p.cuantos));
  if (!Number.isFinite(min)) return [];
  // Con un solo color en la receta el "cuello" es obvio: no se anota.
  if (posibles.length === 1) return [];
  return posibles.filter(p => p.cuantos === min).map(p => p.color);
}

export default function StockCompartidoPage() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [snap, setSnap] = useState<SharedStockSnapshot | null>(null);
  const [borrador, setBorrador] = useState<Borrador>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const load = useCallback(async () => {
    if (!puede('pedidos')) return;
    setCargando(true);
    try {
      const res = await fetch('/api/admin/shared-stock', { headers: headers(), cache: 'no-store' });
      const data = await res.json();
      if (res.ok) { setSnap(data.snapshot); setBorrador({}); setMsg(null); }
      else setMsg({ tipo: 'error', texto: data.error || 'No se pudo leer el stock.' });
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al conectar.' });
    } finally { setCargando(false); }
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(); }, [autorizado, load]);

  const hayCambios = useMemo(
    () => Object.values(borrador).some(porTalle => Object.values(porTalle).some(v => v.trim() !== '')),
    [borrador],
  );

  function editar(color: string, talle: string, valor: string) {
    setBorrador(b => ({ ...b, [color]: { ...(b[color] || {}), [talle]: valor } }));
    setMsg(null);
  }

  async function guardar() {
    if (!snap) return;
    const armado = buildPoolsPayload(borrador, snap.pools.map(p => p.color), snap.sizes);
    if ('error' in armado) { setMsg({ tipo: 'error', texto: armado.error }); return; }

    setGuardando(true);
    try {
      const res = await fetch('/api/admin/shared-stock', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pools: armado.pools }),
      });
      const data = await res.json();
      if (res.ok) {
        setSnap(data.snapshot);
        setBorrador({});
        setMsg({ tipo: 'ok', texto: 'Guardado. Los packs quedaron recalculados.' });
      } else {
        setMsg({ tipo: 'error', texto: data.error || 'No se pudo guardar.' });
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al conectar.' });
    } finally { setGuardando(false); }
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
  if (!puede('pedidos')) return <div className="p-8 text-center text-[13px] text-muted-foreground">Sin acceso a Stock.</div>;

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Stock compartido</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={cargando || guardando} title="Volver a leer de WooCommerce"
            className="h-9 w-9 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
            <RotateCcw size={15} />
          </button>
          <button onClick={guardar} disabled={!hayCambios || guardando || cargando}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Las Regular Tees salen de cuatro pilas físicas de color. Cargá lo que hay en depósito y los packs se recalculan solos.
      </p>
      {msg && (
        <p className={`text-[12px] mt-2 ${msg.tipo === 'ok' ? 'text-success' : 'text-warning'}`}>{msg.texto}</p>
      )}

      {cargando && !snap && <p className="mt-8 text-center text-[13px] text-muted-foreground">Cargando…</p>}

      {snap && (
        <>
          {/* ── Pilas: lo único editable ─────────────────────────────────── */}
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground mt-8 mb-1">Unidades en depósito</h2>
          <p className="text-[12px] text-muted-foreground mb-3">
            Remeras sueltas de cada color. Dejá un casillero vacío para no tocar ese talle.
          </p>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[420px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">Color</th>
                  {snap.sizes.map(s => <th key={s} className="font-medium px-2 py-2.5 w-[76px] text-center">{s}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snap.pools.map(pool => (
                  <tr key={pool.color}>
                    <td className="px-4 py-2.5">
                      <span className="text-foreground font-medium">{COLOR_LABEL[pool.color] ?? pool.color}</span>
                      <span className="block text-[11px] text-muted-foreground/70">{pool.name}</span>
                    </td>
                    {snap.sizes.map(talle => {
                      const actual = pool.stock[talle];
                      const editado = borrador[pool.color]?.[talle] ?? '';
                      return (
                        <td key={talle} className="px-2 py-2.5 text-center">
                          <input
                            inputMode="numeric"
                            value={editado}
                            placeholder={actual === null || actual === undefined ? '—' : String(actual)}
                            onChange={e => editar(pool.color, talle, e.target.value)}
                            aria-label={`${COLOR_LABEL[pool.color] ?? pool.color} talle ${talle}`}
                            className="w-[60px] border border-border rounded-md bg-card px-2 py-1 text-[13px] text-foreground text-right tabular-nums placeholder:text-muted-foreground/60"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cómo queda el catálogo ───────────────────────────────────── */}
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground mt-8 mb-1">Cómo queda en la tienda</h2>
          <p className="text-[12px] text-muted-foreground mb-3">
            Stock que ve el cliente. Los packs no se editan: salen del color que primero se agota.
          </p>
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5">Producto</th>
                  <th className="text-left font-medium px-2 py-2.5">Lleva</th>
                  {snap.sizes.map(s => <th key={s} className="font-medium px-2 py-2.5 w-[56px] text-center">{s}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {snap.products.map(prod => (
                  <tr key={prod.productId} className={prod.isPool ? 'bg-muted/40' : undefined}>
                    <td className="px-4 py-2.5 text-foreground">
                      {prod.name}
                      {prod.isPool && <span className="block text-[11px] text-muted-foreground/70">es la pila de su color</span>}
                    </td>
                    <td className="px-2 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                      {Object.entries(prod.recipe)
                        .map(([color, n]) => `${n} ${COLOR_LABEL[color] ?? color}`)
                        .join(' + ')}
                    </td>
                    {snap.sizes.map(talle => {
                      const qty = prod.stock[talle];
                      const limita = prod.isPool ? [] : cuellos(prod, snap, talle);
                      return (
                        <td key={talle} className="px-2 py-2.5 text-center tabular-nums">
                          <span className={qty === 0 ? 'text-warning font-semibold' : 'text-foreground'}>
                            {qty === null || qty === undefined ? '—' : qty}
                          </span>
                          {limita.length > 0 && (
                            <span className="block text-[10px] text-muted-foreground/70 leading-tight">
                              {limita.map(c => COLOR_LABEL[c] ?? c).join('/')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            Debajo de cada número, el color que marca el límite. Vender cualquiera de estos productos descuenta de las pilas
            y vuelve a bajar el resto.
          </p>
        </>
      )}
    </div>
  );
}
