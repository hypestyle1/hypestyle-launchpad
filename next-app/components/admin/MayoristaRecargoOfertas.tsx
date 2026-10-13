'use client';

import { useState } from 'react';
import type { SaleMarkup } from '@/lib/mayorista-price-audit';

// Panel de /admin/mayoristas: qué productos del catálogo mayorista están en
// oferta minorista y cuánto recarga de verdad el revendedor vendiendo al
// precio de hoy (lib/mayorista-price-audit.ts, saleMarkupOf). Consulta la
// auditoría a pedido, sin escribir marcas ni mandar mail. No cambia precios.

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function MayoristaRecargoOfertas({ adminKey }: { adminKey: string }) {
  const [list, setList] = useState<SaleMarkup[] | null>(null);
  const [audited, setAudited] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyCritical, setOnlyCritical] = useState(false);

  async function revisar() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mayorista-precios-audit?dry=1&mail=0', { headers: { 'x-admin-key': adminKey }, cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`);
      setList(data.saleMarkup ?? []);
      setAudited(typeof data.audited === 'number' ? data.audited : null);
    } catch (e: any) {
      setError(e.message || 'No se pudo consultar');
    } finally {
      setLoading(false);
    }
  }

  const shown = (list ?? []).filter(s => !onlyCritical || s.level === 'critical');
  const critical = (list ?? []).filter(s => s.level === 'critical').length;

  return (
    <div className="bg-card rounded-lg border border-border p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Recargo real con ofertas minoristas</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">
            El mayorista paga 50% de la lista. Si la tienda tiene el producto en oferta, el local recarga menos del 100% vendiendo al precio de hoy.
            Esto solo informa: no cambia precios ni ofertas. El cron diario avisa por mail cuando alguno queda por debajo del 50%.
          </p>
        </div>
        <button
          onClick={revisar}
          disabled={loading}
          className="text-[12px] font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40"
        >
          {loading ? 'Revisando…' : list ? 'Volver a revisar' : 'Revisar ahora'}
        </button>
      </div>

      {error && <p className="text-[12px] text-red-700 mt-3">{error}</p>}

      {list && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <span>
              {list.length === 0
                ? 'Ningún producto mayorista en oferta minorista.'
                : <>{list.length} de {audited ?? '?'} productos en oferta{critical ? <> · <b className="text-red-700">{critical} con recargo menor al 50%</b></> : ''}.</>}
            </span>
            {critical > 0 && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={onlyCritical} onChange={e => setOnlyCritical(e.target.checked)} />
                Solo críticos
              </label>
            )}
          </div>

          {shown.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <tr>
                    <th className="text-left py-1.5 pr-3">Producto</th>
                    <th className="text-right py-1.5 px-3">Lista</th>
                    <th className="text-right py-1.5 px-3">Hoy en la tienda</th>
                    <th className="text-right py-1.5 px-3">Mayorista</th>
                    <th className="text-right py-1.5 pl-3">Recargo real</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(s => (
                    <tr key={s.id} className={`border-t border-border ${s.level === 'critical' ? 'bg-red-50' : ''}`}>
                      <td className="py-1.5 pr-3">
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="text-muted-foreground/70 ml-1.5">#{s.id}</span>
                      </td>
                      <td className="text-right py-1.5 px-3 tabular-nums">{fmt(s.regular)}</td>
                      <td className="text-right py-1.5 px-3 tabular-nums">{fmt(s.sale)} <span className="text-muted-foreground/70">−{pct(1 - s.sale / s.regular)}</span></td>
                      <td className="text-right py-1.5 px-3 tabular-nums">{fmt(s.ws)}</td>
                      <td className={`text-right py-1.5 pl-3 tabular-nums font-semibold ${s.level === 'critical' ? 'text-red-700' : 'text-foreground'}`}>{pct(s.markup)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
