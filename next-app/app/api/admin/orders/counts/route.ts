import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';
import { fetchProcessingOrdersResult, splitProcessing, anomaliasDe, type FetchProcessingResult } from '@/lib/orders-fulfillment';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

/**
 * Total de pedidos en un estado. `after` vacío = sin corte de fecha (para los
 * estados accionables: un pedido viejo que revive tiene que seguir contándose).
 *
 * Lanza si WC responde mal. Antes devolvía `parseInt(null || '0')` = 0 ante
 * cualquier error, que es como el contador de "enviado" (un estado que no
 * existe → 400) estuvo marcando cero para siempre sin que se notara.
 */
async function statusTotal(status: string, after: string): Promise<number> {
  const qs = new URLSearchParams({ status, per_page: '1', _cb: String(Date.now()) });
  if (after) qs.set('after', after);
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders?${qs}`, {
    headers: { Authorization: wcAuth() },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`WC ${res.status} al contar ${status}`);
  const total = res.headers.get('X-WP-Total');
  if (total === null) throw new Error(`WC no devolvió X-WP-Total al contar ${status}`);
  return parseInt(total, 10);
}

export async function GET(req: NextRequest) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // El corte sólo aplica a estados terminales (histórico). Los accionables se
  // cuentan completos: `after: ''`.
  const after = req.nextUrl.searchParams.get('after') || '2026-05-10T00:00:00';

  const tareas = {
    processing:  fetchProcessingOrdersResult(''),
    pendientes:  statusTotal('pending', ''),
    enEspera:    statusTotal('on-hold', ''),
    fallidos:    statusTotal('failed', ''),
    completados: statusTotal('completed', after),
  } as const;

  const res = await Promise.allSettled(Object.values(tareas));
  const claves = Object.keys(tareas) as (keyof typeof tareas)[];

  // Qué se pudo cargar y qué no. El cliente necesita poder distinguir "cero
  // pedidos" de "no se pudo consultar": nunca más un error disfrazado de cero.
  const errores: string[] = [];
  const valor = <T,>(i: number, fallback: T): T => {
    const r = res[i];
    if (r.status === 'fulfilled') return r.value as T;
    errores.push(`${claves[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    return fallback;
  };

  const vacio: FetchProcessingResult = { orders: [], parcial: true, totalEsperado: 0 };
  const processing  = valor<FetchProcessingResult>(0, vacio);
  const pendientes  = valor<number | null>(1, null);
  const enEspera    = valor<number | null>(2, null);
  const fallidos    = valor<number | null>(3, null);
  const completados = valor<number | null>(4, null);

  const procOk = res[0].status === 'fulfilled';
  const proc   = splitProcessing(processing.orders);

  return NextResponse.json({
    // null = no se pudo consultar (≠ 0 pedidos). El panel lo muestra como "—".
    porEmpaquetar:     procOk ? proc.sinEmpaquetar : null, // pagado, sin rótulo → hay que empaquetarlo en Andreani
    empaquetados:      procOk ? proc.empaquetados  : null, // rótulo generado, falta que Andreani le asigne guía
    enviadosSinMarcar: procOk ? proc.enviados      : null, // ya tiene guía real pero sigue en "procesando"
    pendientes,                                            // sin pagar
    enEspera,                                              // on-hold: mayoristas esperando coordinar el pago
    fallidos,                                              // failed: pago rechazado, plata recuperable
    completados,                                           // cerrados (desde el corte de fecha)
    // Pedidos que no entran en ninguna cola pero piden revisión humana.
    anomalias: procOk ? anomaliasDe(processing.orders) : [],
    // true = los conteos de processing salen de una lista incompleta.
    parcial: procOk && processing.parcial,
    errores,
    ok: errores.length === 0 && !(procOk && processing.parcial),
  });
}
