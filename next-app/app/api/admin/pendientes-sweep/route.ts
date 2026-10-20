import { NextRequest, NextResponse } from 'next/server';
import { decidir, resumir, META_EXPIRADO, type PedidoPendiente, type Decision } from '@/lib/pendientes-expiracion';

/**
 * Barrido de pedidos sin pagar (auditoría 17/10).
 *
 * Por defecto SIMULA: dice qué cancelaría y por qué, sin tocar nada. Para
 * ejecutar de verdad hacen falta las tres cosas a la vez:
 *   1. el secreto del cron,
 *   2. `PENDIENTES_SWEEP_ENABLED=true` en Vercel,
 *   3. `?dry=0` explícito en la llamada.
 * Así ni un deploy ni un cron mal configurado pueden cancelar pedidos solos.
 *
 * Cada cancelación deja nota en el pedido y el meta `_hs_expirado_auto` con
 * la fecha: es el registro de la acción y la forma de revertir (buscar por
 * ese meta y devolver a pending). Cancelar un pending no toca stock: el
 * checkout headless nunca lo descontó.
 *
 * Respuesta sin datos personales: solo id, número, método, horas y motivo.
 */

export const dynamic = 'force-dynamic';

const WP_URL  = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY  = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC  = process.env.WC_CONSUMER_SECRET || '';
const SECRET  = (process.env.CRON_SECRET || '').trim();

const wcAuth = () => 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');

/** Tope por corrida: el cron pasa seguido; mejor avanzar de a poco que hacer un batch enorme. */
const MAX_POR_CORRIDA = 40;

async function traerPendientes(): Promise<PedidoPendiente[]> {
  const pedidos: PedidoPendiente[] = [];
  // Paginado en serie: WordPress no aguanta el fan-out (ver PR #356).
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/orders?status=pending&per_page=100&page=${page}&orderby=date&order=asc`
      + `&_fields=id,number,status,created_via,payment_method,date_created_gmt,date_paid_gmt,transaction_id,total,meta_data`,
      { headers: { Authorization: wcAuth() }, cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`WC ${res.status} al listar pendientes`);
    const lote = (await res.json()) as PedidoPendiente[];
    pedidos.push(...lote);
    if (lote.length < 100) break;
  }
  return pedidos;
}

async function cancelar(pedido: { id: number }, ahoraIso: string): Promise<boolean> {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${pedido.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      status: 'cancelled',
      meta_data: [{ key: META_EXPIRADO, value: ahoraIso }],
    }),
  });
  if (!res.ok) {
    console.error('[pendientes-sweep] no se pudo cancelar', pedido.id, res.status);
    return false;
  }
  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${pedido.id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      note: 'Cancelado automáticamente por falta de pago (barrido de pendientes). '
        + 'Si el cliente pagó, volver a Pendiente y revisar la acreditación.',
      customer_note: false,
    }),
  }).catch((e) => console.warn('[pendientes-sweep] nota no agregada', pedido.id, e));
  return true;
}

export async function GET(req: NextRequest) {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || bearer;
  if (!SECRET || provided !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Simulación salvo que se pida explícitamente lo contrario Y esté habilitado.
  const pidenEjecutar = req.nextUrl.searchParams.get('dry') === '0';
  const habilitado = process.env.PENDIENTES_SWEEP_ENABLED === 'true';
  const simular = !pidenEjecutar || !habilitado;

  let pedidos: PedidoPendiente[];
  try {
    pedidos = await traerPendientes();
  } catch (e) {
    console.error('[pendientes-sweep]', e);
    return NextResponse.json({ error: 'No se pudieron leer los pedidos' }, { status: 502 });
  }

  const ahora = Date.now();
  const decisiones: Decision[] = pedidos.map((p) => decidir(p, ahora));
  const aCancelar = decisiones.filter(
    (d): d is Extract<Decision, { accion: 'cancelar' }> => d.accion === 'cancelar',
  );
  const lote = aCancelar.slice(0, MAX_POR_CORRIDA);

  const cancelados: number[] = [];
  const fallidos: number[] = [];
  if (!simular) {
    const ahoraIso = new Date(ahora).toISOString();
    for (const d of lote) {
      const ok = await cancelar(d, ahoraIso);
      (ok ? cancelados : fallidos).push(d.id);
    }
  }

  return NextResponse.json({
    modo: simular ? 'simulacion' : 'ejecucion',
    habilitado,
    ...resumir(decisiones),
    enEsteLote: lote.length,
    pendientesDeProximaCorrida: Math.max(0, aCancelar.length - lote.length),
    cancelados: simular ? [] : cancelados,
    fallidos: simular ? [] : fallidos,
    detalle: lote.map((d) => ({
      id: d.id, numero: d.numero, metodo: d.metodo || '(sin método)',
      horas: d.horas, esperaHoras: d.espera, total: d.total,
    })),
  });
}
