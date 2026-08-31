'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { POD_SIZES, SIN_TALLE, ordenTalle, type PodPendiente } from '@/lib/pod';

// Cola de estampado: las prendas print on demand de los pedidos que todavía
// están por empaquetar. Son las únicas que hay que mandar a hacer — en cuanto
// el pedido tiene rótulo la prenda ya está estampada y sale de la lista sola.
//
// La cuenta que importa para el pedido semanal es la de blanks: el blank sirve
// para cualquier diseño que salga de él, así que se piden por pila y talle, no
// por diseño (ver PHP/hypestyle-api.php, HS_STOCK_RECIPES).

/** Talles presentes en la cola, en orden, con el "sin talle" al final. */
function tallesDe(data: PodPendiente): string[] {
  const vistos = new Set(data.lineas.map(l => l.talle));
  const orden: string[] = POD_SIZES.filter(s => vistos.has(s));
  for (const t of vistos) if (t !== SIN_TALLE && !orden.includes(t)) orden.push(t);
  if (vistos.has(SIN_TALLE)) orden.push(SIN_TALLE);
  return orden;
}

/** Lista en texto plano, para pegarla en el mensaje al proveedor. */
function comoTexto(data: PodPendiente): string {
  const out: string[] = ['Pendiente a estampar — ' + data.total + ' prendas', ''];
  for (const b of data.blanks) {
    const talles = Object.keys(b.porTalle)
      .sort((x, y) => ordenTalle(x) - ordenTalle(y))
      .map(t => t + ' ' + b.porTalle[t])
      .join('  ');
    out.push(b.label + ': ' + talles + '  (total ' + b.total + ')');
    for (const l of data.lineas.filter(l => l.blank === b.blank)) {
      out.push('   ' + l.design + ' — talle ' + l.talle + ' — ' + l.cantidad + ' u — '
        + l.pedidos.map(p => '#' + p.number).join(' '));
    }
    out.push('');
  }
  return out.join('\n').trim();
}

export default function PendienteEstampar({ adminKey }: { adminKey: string }) {
  const [data, setData]         = useState<PodPendiente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');
  const [abierto, setAbierto]   = useState(true);
  const [copiado, setCopiado]   = useState(false);

  const load = useCallback(async () => {
    if (!adminKey) return;
    setCargando(true);
    try {
      const res = await fetch('/api/admin/pod-pendientes', {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) { setData(json); setError(''); }
      else setError(json.error || 'No se pudo leer la cola de estampado.');
    } catch {
      setError('Error al conectar.');
    } finally {
      setCargando(false);
    }
  }, [adminKey]);

  useEffect(() => { load(); }, [load]);

  const talles = useMemo(() => (data ? tallesDe(data) : []), [data]);

  async function copiar() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(comoTexto(data));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  if (!data && !error) return null;

  return (
    <div className="bg-card rounded-lg border border-border mb-4">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          onClick={() => setAbierto(a => !a)}
          className="flex items-center gap-2 text-[13px] font-semibold text-foreground"
        >
          <ChevronDown size={14} className={`transition-transform ${abierto ? '' : '-rotate-90'}`} />
          Pendiente a estampar
        </button>
        {data && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${data.total > 0 ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'}`}>
            {data.total} {data.total === 1 ? 'prenda' : 'prendas'}
          </span>
        )}
        {data && data.sinTalle > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {data.sinTalle} sin talle
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {data && data.total > 0 && (
            <button
              onClick={copiar}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-border hover:border-border-mid text-muted-foreground hover:text-foreground"
            >
              {copiado ? 'Copiado' : 'Copiar lista'}
            </button>
          )}
          <button
            onClick={load}
            disabled={cargando}
            className="text-muted-foreground/70 hover:text-foreground p-1 rounded hover:bg-muted disabled:opacity-40"
            aria-label="Actualizar"
          >
            <RotateCcw size={13} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {error && <p className="text-[12px] text-red-600">{error}</p>}

          {data && data.total === 0 && !error && (
            <p className="text-[12px] text-muted-foreground">
              Nada pendiente de estampar en los {data.porEmpaquetar} pedidos por empaquetar.
            </p>
          )}

          {data && data.total > 0 && (
            <>
              {data.sinTalle > 0 && (
                <p className="text-[11px] text-red-600 mb-3">
                  Hay {data.sinTalle} {data.sinTalle === 1 ? 'prenda' : 'prendas'} sin talle en la orden:
                  confirmalo con el cliente antes de mandarla a estampar.
                </p>
              )}

              {/* Para el pedido semanal: por pila de blanks, que es como se compran. */}
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                Blanks a cubrir
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-muted-foreground/70">
                      <th className="text-left font-medium py-1.5 pr-3">Blank</th>
                      {talles.map(t => <th key={t} className="w-12 text-center font-medium py-1.5">{t}</th>)}
                      <th className="w-14 text-right font-medium py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.blanks.map(b => (
                      <tr key={b.blank} className="border-t border-border">
                        <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{b.label}</td>
                        {talles.map(t => (
                          <td key={t} className={`text-center py-1.5 ${b.porTalle[t] ? 'font-semibold' : 'text-muted-foreground/40'}`}>
                            {b.porTalle[t] || '·'}
                          </td>
                        ))}
                        <td className="text-right py-1.5 font-semibold">{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detalle: qué diseño lleva cada blank y para qué pedido. */}
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mt-4 mb-2">
                Qué estampar
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-muted-foreground/70">
                      <th className="text-left font-medium py-1.5 pr-3">Diseño</th>
                      <th className="w-14 text-center font-medium py-1.5">Talle</th>
                      <th className="w-12 text-right font-medium py-1.5 pr-3">Unid.</th>
                      <th className="text-left font-medium py-1.5">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lineas.map(l => (
                      <tr key={`${l.productId}-${l.talle}`} className="border-t border-border">
                        <td className="py-1.5 pr-3 font-medium">{l.design}</td>
                        <td className={`text-center py-1.5 ${l.talle === SIN_TALLE ? 'text-red-600 font-semibold' : ''}`}>{l.talle}</td>
                        <td className="text-right py-1.5 pr-3 font-semibold">{l.cantidad}</td>
                        <td className="py-1.5">
                          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {l.pedidos.map(p => (
                              <a
                                key={p.id}
                                href={`/admin/pedidos/${p.id}`}
                                className="text-muted-foreground hover:text-foreground hover:underline"
                              >
                                #{p.number}
                              </a>
                            ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
