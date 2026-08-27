'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, Plus } from 'lucide-react';

// Live search de productos Woo, reutilizable. Busca server-side (nunca carga el
// catálogo entero en el browser) y devuelve IDs Woo reales. Dos variantes:
//   <ProductMultiSelect>  → productIds: number[]  (ContentItem, Campaign)
//   <ItemsSentEditor>     → itemsSent con cantidad/talle (Collaboration)

export interface WooProduct { id: number; name: string; sku: string; type: string; variable: boolean; price: number; image: string | null }

function useProductSearch(headers: () => Record<string, string>) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/products/search?search=${encodeURIComponent(q.trim())}&perPage=10`, { headers: headers() });
        const d = await r.json();
        setResults(Array.isArray(d.products) ? d.products : []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 280);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, headers]);
  return { q, setQ, results, loading };
}

// Hidrata nombres de IDs ya guardados (para mostrar el chip aunque no se busque).
function useHydrate(ids: number[], headers: () => Record<string, string>) {
  const [map, setMap] = useState<Record<number, WooProduct>>({});
  const key = ids.slice().sort().join(',');
  useEffect(() => {
    const missing = ids.filter((id) => !map[id]);
    if (!missing.length) return;
    fetch(`/api/admin/products/search?include=${missing.join(',')}&perPage=30`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.products)) setMap((m) => { const n = { ...m }; for (const p of d.products) n[p.id] = p; return n; }); })
      .catch(() => {});
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}

function SearchBox({ headers, onPick, exclude }: { headers: () => Record<string, string>; onPick: (p: WooProduct) => void; exclude: number[] }) {
  const { q, setQ, results, loading } = useProductSearch(headers);
  const [open, setOpen] = useState(false);
  const inputCls = 'w-full border border-border bg-card text-foreground rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-mid';
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
      <input className={inputCls} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="Buscar producto por nombre o SKU…" />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-[260px] overflow-y-auto">
          {loading ? <p className="px-3 py-2 text-[12px] text-muted-foreground">Buscando…</p>
            : results.length === 0 ? <p className="px-3 py-2 text-[12px] text-muted-foreground">Sin resultados.</p>
            : results.filter((p) => !exclude.includes(p.id)).map((p) => (
              <button key={p.id} onClick={() => { onPick(p); setQ(''); setOpen(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/50">
                {p.image ? <img src={p.image} alt="" className="h-7 w-7 rounded object-cover shrink-0" /> : <span className="h-7 w-7 rounded bg-muted shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] text-foreground truncate">{p.name}</span>
                  <span className="block text-[10.5px] text-muted-foreground">{p.sku ? `SKU ${p.sku} · ` : ''}#{p.id}{p.variable ? ' · variable' : ''}</span>
                </span>
                <Plus size={13} className="text-muted-foreground shrink-0" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function ProductMultiSelect({ value, onChange, headers }: { value: number[]; onChange: (ids: number[]) => void; headers: () => Record<string, string> }) {
  const map = useHydrate(value, headers);
  return (
    <div className="space-y-2">
      <SearchBox headers={headers} exclude={value} onPick={(p) => onChange([...value, p.id])} />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 bg-muted rounded-md pl-1 pr-1.5 py-0.5 text-[11.5px] text-foreground">
              {map[id]?.image && <img src={map[id].image!} alt="" className="h-4 w-4 rounded object-cover" />}
              <span className="max-w-[160px] truncate">{map[id]?.name || `#${id}`}</span>
              <button onClick={() => onChange(value.filter((x) => x !== id))} className="text-muted-foreground/60 hover:text-destructive"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SentItem { productId: number; quantity: number; variationId?: number; size?: string; notes?: string }

export function ItemsSentEditor({ value, onChange, headers }: { value: SentItem[]; onChange: (items: SentItem[]) => void; headers: () => Record<string, string> }) {
  const ids = value.map((i) => i.productId);
  const map = useHydrate(ids, headers);
  const upd = (i: number, patch: Partial<SentItem>) => onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const inputCls = 'border border-border bg-card text-foreground rounded-md px-2 py-1 text-[12px] focus:outline-none focus:border-border-mid';
  return (
    <div className="space-y-2">
      <SearchBox headers={headers} exclude={ids} onPick={(p) => onChange([...value, { productId: p.id, quantity: 1 }])} />
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((it, i) => (
            <div key={`${it.productId}-${i}`} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5">
              {map[it.productId]?.image ? <img src={map[it.productId].image!} alt="" className="h-8 w-8 rounded object-cover shrink-0" /> : <span className="h-8 w-8 rounded bg-muted shrink-0" />}
              <span className="min-w-0 flex-1 text-[12px] text-foreground truncate">{map[it.productId]?.name || `#${it.productId}`}</span>
              <input className={`${inputCls} w-14 text-center`} type="number" min={1} value={it.quantity} onChange={(e) => upd(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} title="Cantidad" />
              <input className={`${inputCls} w-16`} value={it.size || ''} onChange={(e) => upd(i, { size: e.target.value })} placeholder="Talle" title="Talle" />
              <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-muted-foreground/60 hover:text-destructive shrink-0"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
