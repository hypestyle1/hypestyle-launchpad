'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { metodoDef } from '@/lib/mayorista-envio';

const WP_SECRET_KEY = 'hype_admin_key';

type Order = {
  id: number; number: string; date: string;
  customer: { first_name: string; last_name: string; phone: string; dni: string };
  shipping: { first_name: string; last_name: string; address_1: string; address_2: string; city: string; state: string; postcode: string; country?: string };
  viaCargoSucursal: string;
  shippingBranch?: string;
  shipping_lines?: { method_title: string }[];
  envio?: { metodo: string | null; destino: string; resumen: string };
  // Del detalle solo se usa el total de unidades: el listado de prendas no va
  // en el rótulo.
  items: { quantity: number }[];
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Nombre del país para la etiqueta. Woo guarda el código ISO; el navegador lo
// traduce y evita arrastrar una tabla de países hasta acá. Un código que no
// conoce (el checkout permite 'OTHER') vuelve como vino.
function nombrePais(code: string) {
  try {
    return new Intl.DisplayNames(['es-AR'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default function RotuloPage() {
  const { id } = useParams<{ id: string }>();
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [order, setOrder]       = useState<Order | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(WP_SECRET_KEY);
    if (stored) { setAdminKey(stored); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed || !adminKey || !id) return;
    setLoading(true);
    fetch(`/api/admin/orders/${id}`, { headers: { 'x-admin-key': adminKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.error) setOrder(data); })
      .finally(() => setLoading(false));
  }, [authed, adminKey, id]);

  function login() {
    sessionStorage.setItem(WP_SECRET_KEY, keyInput);
    setAdminKey(keyInput);
    setAuthed(true);
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

  if (loading) return <div className="flex items-center justify-center py-32 text-[13px] text-muted-foreground/70">Cargando rótulo...</div>;
  if (!order) return <div className="flex items-center justify-center py-32 text-[13px] text-red-500">No se pudo cargar el pedido</div>;

  // Bloque destacado del envío: el servicio y, si hay, la sucursal o el
  // expreso. Una orden vieja con solo la sucursal se lee como Via Cargo.
  const envioDef = metodoDef(order.envio?.metodo ?? (order.viaCargoSucursal ? 'via_cargo' : null));
  // Un pedido normal no pasa por el selector mayorista: el transporte sale de
  // la línea de envío de Woo ("Andreani (sucursal)") y la sucursal elegida, del
  // meta que guarda el checkout.
  const envioMetodo  = envioDef?.label || order.shipping_lines?.[0]?.method_title || '';
  const envioDestino = envioDef
    ? (envioDef.destinoLabel ? (order.envio?.destino || order.viaCargoSucursal || '') : '')
    : (order.shippingBranch || '');

  // Fuera de Argentina el país es el dato que decide el envío, así que va en la
  // dirección y no abajo entre los detalles.
  const pais = order.shipping.country && order.shipping.country !== 'AR'
    ? nombrePais(order.shipping.country)
    : '';

  const unidades = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="rotulo-wrap min-h-screen bg-[#e8e8e8] py-8 print:bg-card print:py-0">
      <div className="no-print max-w-[480px] mx-auto mb-4 flex items-center justify-between px-2">
        <a href={`/admin/pedidos/${order.id}`} className="text-[12px] text-muted-foreground hover:text-foreground">← Volver al pedido</a>
        <button
          onClick={() => window.print()}
          className="text-[12px] font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90"
        >
          🖨 Imprimir rótulo
        </button>
      </div>

      {/* Rótulo — 10x15cm exactos al imprimir (ver @page abajo); en pantalla se */}
      {/* previsualiza en la misma proporción 2:3 a un tamaño más cómodo de leer. */}
      <div className="rotulo-hoja mx-auto" style={{ width: '480px' }}>
        <div className="rotulo bg-card border-2 border-foreground" style={{ width: '480px', height: '720px' }}>
          <div className="p-8 flex flex-col h-full">
            <div className="flex items-center justify-between pb-5 border-b-2 border-foreground">
              <img src="/logo-hypestyle-2026.png" alt="Hypestyle" className="h-10 w-auto" />
              <div className="text-right">
                <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Pedido</div>
                <div className="text-[30px] font-bold leading-none">#{order.number}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Destinatario</div>
              <div className="text-[28px] font-bold leading-tight">
                {order.shipping.first_name} {order.shipping.last_name}
              </div>
              {order.customer.dni && (
                <div className="text-[17px] text-foreground/80 mt-1">DNI {order.customer.dni}</div>
              )}
            </div>

            <div className="mt-6">
              <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Dirección</div>
              <div className="text-[20px] leading-snug">
                {order.shipping.address_1}{order.shipping.address_2 ? `, ${order.shipping.address_2}` : ''}
              </div>
              <div className="text-[20px] leading-snug">
                {order.shipping.city}{order.shipping.state ? `, ${order.shipping.state}` : ''} {order.shipping.postcode ? `(${order.shipping.postcode})` : ''}
              </div>
              {pais && (
                <div className="text-[22px] font-bold uppercase leading-snug mt-1">{pais}</div>
              )}
              {order.customer.phone && (
                <div className="text-[17px] text-foreground/80 mt-1.5">Tel: {order.customer.phone}</div>
              )}
            </div>

            {(envioMetodo || envioDestino) && (
              <div className="mt-6 border-2 border-foreground p-4">
                <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Envío</div>
                {envioMetodo && <div className="text-[22px] font-bold leading-tight">{envioMetodo}</div>}
                {envioDestino && (
                  <div className="text-[18px] leading-snug mt-1">{envioDestino}</div>
                )}
              </div>
            )}

            <div className="mt-6 flex-1 min-h-0 overflow-hidden">
              <div className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                Contenido · {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
              </div>
            </div>

            <div className="pt-4 mt-auto border-t border-border-mid flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground/70">Hypestyle · hypestyle.com.ar</span>
              <span className="text-[13px] text-muted-foreground/70">{fmtDate(order.date)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Fuera del @media: Chrome aplica mejor el tamaño de página cuando
           @page está en el nivel de arriba, y solo rige al imprimir. */
        @page { size: 100mm 150mm; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100mm;
            height: 150mm;
            overflow: hidden;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* El contenedor de pantalla no aporta alto en papel. */
          .rotulo-wrap {
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Única caja del flujo: mide una etiqueta y recorta lo que sobre,
             así nunca se arma una segunda hoja. Deja 1 mm de aire contra los
             bordes, que la PC42t no imprime. */
          .rotulo-hoja {
            position: relative;
            width: 100mm !important;
            height: 149mm;
            overflow: hidden;
            margin: 0 !important;
            padding: 0 !important;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: avoid;
            page-break-after: avoid;
          }
          /* El rótulo sale del flujo y se escala entero: 480×720 px por
             0,7715 son 98×147 mm. Va con transform y no con zoom porque zoom
             sí ocupa lugar en el flujo, y por redondeo la última franja del
             rótulo (el pie) se iba a una segunda hoja. */
          .rotulo {
            position: absolute;
            top: 1mm;
            left: 1mm;
            transform: scale(0.7715);
            transform-origin: top left;
            box-shadow: none !important;
            margin: 0 !important;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}
