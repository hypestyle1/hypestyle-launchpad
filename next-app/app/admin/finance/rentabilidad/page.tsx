'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, X } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fmtARS, fmtDate } from '@/lib/admin-format';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DateRangePicker, makeRangeState, type RangeState } from '@/components/admin/DateRangePicker';
import { SourceBadge, Waterfall, FinanceSectionTitle, pct, type WaterfallRow } from '@/components/admin/finance/blocks';
import type { DataSource } from '@/lib/finance/types';

interface OrderRow {
  id: number; number: string; date: string; customerName?: string; paymentMethod: string; paymentTitle: string;
  revenue: number; refunds: number; netRevenue: number; cogs: number; cogsSource: DataSource; grossProfit: number;
  fee: { group: string; economicCost: number; netReceived: number; otherCashDeduction: number; source: DataSource };
  shipping: { charged: number; realCost: number | null; absorbed: number; difference: number | null; realSource: DataSource };
  variableCosts: { total: number; source: DataSource; items: { label: string; amount: number }[] };
  contributionProfit: number; contributionMargin: number; grossCollected: number; netCollected: number; complete: boolean;
}
interface ProdRow {
  productId: number; name: string; units: number; revenue: number; cogs: number | null;
  grossProfit: number | null; grossMargin: number | null; allocatedContribution: number | null;
}

export default function Rentabilidad() {
  const { autorizado, headers, puede, ingresarConClave } = useAdminAuth();
  const [keyInput, setKeyInput] = useState('');
  const [range, setRange] = useState<RangeState>(() => makeRangeState('last30', false));
  const [tab, setTab] = useState<'pedidos' | 'productos'>('pedidos');
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [products, setProducts] = useState<ProdRow[] | null>(null);
  const [sel, setSel] = useState<OrderRow | null>(null);
  const [marginFilter, setMarginFilter] = useState<'all' | 'positive' | 'negative' | 'incomplete'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async (r: RangeState) => {
    if (!puede('costos')) return;
    const qs = new URLSearchParams({ start: r.range.startUTC, end: r.range.endUTC });
    setOrders(null); setProducts(null);
    fetch(`/api/admin/finance/orders?${qs}`, { headers: headers() }).then((x) => x.ok ? x.json() : null).then((d) => d && setOrders(d.orders)).catch(() => {});
    fetch(`/api/admin/finance/products?${qs}`, { headers: headers() }).then((x) => x.ok ? x.json() : null).then((d) => d && setProducts(d.products)).catch(() => {});
  }, [headers, puede]);

  useEffect(() => { if (autorizado) load(range); }, [autorizado, range, load]);

  async function syncMp() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/admin/finance/sync-mp', { method: 'POST', headers: headers() });
      const d = await res.json();
      if (!res.ok) { setSyncMsg(d.error || 'Error en el sync'); return; }
      setSyncMsg(`Sincronizados ${d.synced} · fallidos ${d.failed?.length ?? 0} de ${d.candidates} candidatos`);
      load(range);
    } catch { setSyncMsg('Error al conectar'); } finally { setSyncing(false); }
  }

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (marginFilter === 'positive') return o.contributionProfit > 0;
      if (marginFilter === 'negative') return o.contributionProfit < 0;
      if (marginFilter === 'incomplete') return !o.complete;
      return true;
    });
  }, [orders, marginFilter]);

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

  const orderCols: Column<OrderRow>[] = [
    { key: 'number', header: 'Pedido', render: (o) => <span className="font-medium tabular-nums">#{o.number}</span> },
    { key: 'date', header: 'Fecha', hideOnMobile: true, render: (o) => <span className="text-muted-foreground whitespace-nowrap">{fmtDate(o.date)}</span> },
    { key: 'gw', header: 'Pasarela', hideOnMobile: true, render: (o) => <span className="text-muted-foreground text-[12px]">{o.paymentTitle || o.paymentMethod}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (o) => <span className="tabular-nums">{fmtARS(o.revenue)}</span> },
    { key: 'cogs', header: 'COGS', align: 'right', hideOnMobile: true, render: (o) => o.cogsSource === 'missing' ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-muted-foreground">{fmtARS(o.cogs)}</span> },
    { key: 'fee', header: 'Fee', align: 'right', hideOnMobile: true, render: (o) => o.fee.source === 'missing' ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-muted-foreground">{fmtARS(o.fee.economicCost)}</span> },
    { key: 'contrib', header: 'Contribución', align: 'right', render: (o) => <span className={`tabular-nums font-medium ${o.contributionProfit < 0 ? 'text-destructive' : 'text-foreground'}`}>{fmtARS(o.contributionProfit)}</span> },
    { key: 'margin', header: 'Margen', align: 'right', hideOnMobile: true, render: (o) => <span className="tabular-nums text-muted-foreground">{pct(o.contributionMargin)}</span> },
    { key: 'q', header: '', align: 'center', render: (o) => o.complete ? null : <SourceBadge source="missing" /> },
  ];

  const prodCols: Column<ProdRow>[] = [
    { key: 'name', header: 'Producto', render: (p) => <span className="truncate">{p.name}</span> },
    { key: 'units', header: 'Unid.', align: 'right', render: (p) => <span className="tabular-nums text-muted-foreground">{p.units}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (p) => <span className="tabular-nums">{fmtARS(p.revenue)}</span> },
    { key: 'cogs', header: 'COGS', align: 'right', hideOnMobile: true, render: (p) => p.cogs === null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-muted-foreground">{fmtARS(p.cogs)}</span> },
    { key: 'gp', header: 'Gross Profit', align: 'right', render: (p) => p.grossProfit === null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums">{fmtARS(p.grossProfit)}</span> },
    { key: 'gm', header: 'Margen', align: 'right', hideOnMobile: true, render: (p) => p.grossMargin === null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums text-muted-foreground">{pct(p.grossMargin)}</span> },
    { key: 'contrib', header: 'Contrib. atribuida', align: 'right', hideOnMobile: true, render: (p) => p.allocatedContribution === null ? <span className="text-muted-foreground/50">—</span> : <span className="tabular-nums">{fmtARS(p.allocatedContribution)}</span> },
  ];

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-foreground">Rentabilidad</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Qué pedidos y productos dejan margen.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncMp} disabled={syncing} title="Traer fees reales de Mercado Pago"
            className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium text-foreground hover:border-border-mid disabled:opacity-50">
            {syncing ? 'Sincronizando…' : 'Sincronizar MP'}
          </button>
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => load(range)} className="h-9 w-9 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"><RefreshCw size={14} /></button>
        </div>
      </div>
      {syncMsg && <p className="text-[12px] text-muted-foreground mb-3">{syncMsg}</p>}

      <div className="flex items-center gap-1 mb-4">
        {(['pedidos', 'productos'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded-md text-[13px] font-medium capitalize ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>
        ))}
        {tab === 'pedidos' && (
          <select value={marginFilter} onChange={(e) => setMarginFilter(e.target.value as any)} className="ml-auto h-8 border border-border rounded-md bg-card text-[12px] px-2 text-foreground">
            <option value="all">Todos</option>
            <option value="positive">Margen positivo</option>
            <option value="negative">Margen negativo</option>
            <option value="incomplete">Datos incompletos</option>
          </select>
        )}
      </div>

      {tab === 'pedidos'
        ? <DataTable columns={orderCols} rows={filteredOrders} keyOf={(o) => o.id} loading={orders === null} onRowClick={(o) => setSel(o)} emptyTitle="Sin pedidos en el período" />
        : <DataTable columns={prodCols} rows={products || []} keyOf={(p) => p.productId} loading={products === null} emptyTitle="Sin ventas en el período" />}

      {/* Drawer detalle de pedido */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setSel(null)}>
          <div className="w-full max-w-md bg-background h-full overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-foreground">Pedido #{sel.number}</h3>
              <button onClick={() => setSel(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <Waterfall rows={orderWaterfall(sel)} />
            <div className="bg-card border border-border rounded-lg p-4 mt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2">Caja — {sel.fee.group}</p>
              <div className="flex justify-between text-[13px] py-1"><span className="text-muted-foreground">Gross Collected</span><span className="tabular-nums text-foreground">{fmtARS(sel.grossCollected)}</span></div>
              <div className="flex justify-between text-[13px] py-1"><span className="text-muted-foreground">Costo pasarela</span><span className="tabular-nums text-destructive">−{fmtARS(sel.fee.economicCost)}</span></div>
              {sel.fee.otherCashDeduction > 0 && <div className="flex justify-between text-[13px] py-1"><span className="text-muted-foreground">Otras deducciones (retenciones)</span><span className="tabular-nums text-destructive">−{fmtARS(sel.fee.otherCashDeduction)}</span></div>}
              <div className="flex justify-between text-[13px] py-1 border-t border-border mt-1 pt-2 font-semibold"><span className="text-foreground">Net Collected</span><span className="tabular-nums text-foreground">{fmtARS(sel.netCollected)}</span></div>
            </div>
            <Link href={`/admin/pedidos/${sel.id}`} className="block text-center text-[13px] text-foreground border border-border rounded-lg py-2 mt-3 hover:bg-muted">Ver pedido completo</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function orderWaterfall(o: OrderRow): WaterfallRow[] {
  return [
    { label: 'Revenue', amount: o.revenue, kind: 'add' },
    ...(o.refunds ? [{ label: 'Refunds', amount: o.refunds, kind: 'subtract' as const, source: 'exact' as DataSource }] : []),
    { label: 'Net Revenue', amount: o.netRevenue, kind: 'subtotal' },
    { label: 'COGS', amount: o.cogsSource === 'missing' ? null : o.cogs, kind: 'subtract', source: o.cogsSource },
    { label: 'Gross Profit', amount: o.grossProfit, kind: 'subtotal' },
    { label: 'Payment Fee', amount: o.fee.source === 'missing' ? null : o.fee.economicCost, kind: 'subtract', source: o.fee.source },
    { label: 'Shipping Absorbed', amount: o.shipping.realSource === 'missing' ? null : o.shipping.absorbed, kind: 'subtract', source: o.shipping.realSource },
    { label: 'Variable Costs', amount: o.variableCosts.source === 'missing' ? null : o.variableCosts.total, kind: 'subtract', source: o.variableCosts.source },
    { label: 'Contribution Profit', amount: o.contributionProfit, kind: 'result', hint: `${pct(o.contributionMargin)} margen` },
  ];
}
