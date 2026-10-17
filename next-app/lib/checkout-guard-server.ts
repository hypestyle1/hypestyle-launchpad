import type { NextRequest } from 'next/server';
import { clientIp } from '@/lib/client-ip';
import {
  validarClienteServidor, riesgoCliente, excedeVentana,
  contarPedidosRecientes, decidirBloqueo,
  type ClienteCheckout, type Ventana,
} from '@/lib/checkout-guard';

/**
 * Protección del checkout — parte con estado (auditoría 17/10).
 *
 * Dos capas, ninguna visible para un comprador normal:
 *
 *  1. Ráfagas, en memoria de la instancia: frena un loop apretando "Pagar".
 *     En Vercel la memoria no se comparte entre instancias, así que esto es
 *     mejor-esfuerzo — con tráfico real las requests seguidas suelen caer en
 *     la misma instancia caliente.
 *  2. Ventana de 1 hora, contra WooCommerce: los pedidos ya creados son el
 *     store compartido y persistente (sin servicios nuevos que contratar).
 *     Una consulta de solo lectura por creación de pedido.
 *
 * Política de contingencia (explícita a propósito):
 *  - Si la consulta a Woo falla, queda solo la capa de memoria (fail-open
 *    hacia la disponibilidad: jamás se bloquea una venta porque un chequeo
 *    interno se cayó; queda el warning en los logs).
 *  - `CHECKOUT_GUARD_OFF=true` en Vercel apaga el bloqueo por completo sin
 *    deploy (rollback operativo). La validación de datos y la etiqueta de
 *    riesgo siguen activas: no bloquean ventas.
 *  - En tests (NODE_ENV=test) el rate limit se saltea salvo que el test lo
 *    pida con CHECKOUT_GUARD_TEST=1, para que las suites existentes de las
 *    rutas sigan siendo deterministas.
 *
 * Los límites son generosos a propósito (NAT compartido, reintentos de pago):
 * esto corta "cientos de pedidos por hora", no a un cliente impaciente.
 */

const BURST_IP: Ventana    = { max: 4, ventanaMs: 10 * 60_000 };
const BURST_EMAIL: Ventana = { max: 3, ventanaMs: 10 * 60_000 };
const HORA = { email: 5, ip: 8 };
const VENTANA_WOO_MIN = 60;

// Mensaje único para todo bloqueo por frecuencia: no revela qué regla saltó.
const MENSAJE_429 = 'No pudimos procesar el pedido en este momento. Esperá unos minutos e intentá de nuevo.';

const ventanas = new Map<string, number[]>();

function marcar(clave: string, ahora: number, ventanaMs: number) {
  const lista = (ventanas.get(clave) ?? []).filter((t) => t > ahora - ventanaMs);
  lista.push(ahora);
  ventanas.set(clave, lista);
  // La memoria de una instancia caliente no puede crecer sin techo.
  if (ventanas.size > 5000) {
    for (const [k, ts] of ventanas) if (!ts.some((t) => t > ahora - 60 * 60_000)) ventanas.delete(k);
  }
}

export type GuardOk = { ok: true; riesgo: string[] | null };
export type GuardBloqueo = { ok: false; status: number; mensaje: string };

export async function guardCheckout(args: {
  req: NextRequest;
  customer: ClienteCheckout | undefined;
  internacional: boolean;
  wpUrl: string;
  authHeader: string;
}): Promise<GuardOk | GuardBloqueo> {
  const { req, customer, internacional, wpUrl, authHeader } = args;

  const motivoDatos = validarClienteServidor(customer ?? {}, internacional);
  if (motivoDatos) return { ok: false, status: 400, mensaje: motivoDatos };

  const riesgo = riesgoCliente(customer ?? {});
  const resultado: GuardOk = { ok: true, riesgo: riesgo.alto ? riesgo.motivos : null };

  const enTest = process.env.NODE_ENV === 'test' && process.env.CHECKOUT_GUARD_TEST !== '1';
  if (process.env.CHECKOUT_GUARD_OFF === 'true' || enTest) return resultado;

  const ahora = Date.now();
  const ip = clientIp(req);
  const email = (customer?.email ?? '').trim().toLowerCase();

  // Capa 1 — ráfagas en memoria (solo cuenta pedidos CREADOS, ver registrarCreacion).
  if (ip && excedeVentana(ventanas.get(`ip:${ip}`) ?? [], ahora, BURST_IP)) {
    console.warn('[checkout-guard] ráfaga por IP bloqueada');
    return { ok: false, status: 429, mensaje: MENSAJE_429 };
  }
  if (email && excedeVentana(ventanas.get(`em:${email}`) ?? [], ahora, BURST_EMAIL)) {
    console.warn('[checkout-guard] ráfaga por email bloqueada');
    return { ok: false, status: 429, mensaje: MENSAJE_429 };
  }

  // Capa 2 — ventana de 1 h contra Woo (compartida entre instancias).
  try {
    const desde = new Date(ahora - VENTANA_WOO_MIN * 60_000).toISOString().slice(0, 19);
    const res = await fetch(
      `${wpUrl}/wp-json/wc/v3/orders?after=${desde}&per_page=100&status=any&_fields=id,billing,meta_data`,
      { headers: { Authorization: authHeader }, cache: 'no-store' },
    );
    if (res.ok) {
      const recientes = await res.json();
      if (Array.isArray(recientes)) {
        const motivo = decidirBloqueo(contarPedidosRecientes(recientes, { email, ip }), HORA);
        if (motivo) {
          console.warn('[checkout-guard] ventana de 1h excedida:', motivo);
          return { ok: false, status: 429, mensaje: MENSAJE_429 };
        }
      }
    } else {
      console.warn('[checkout-guard] consulta a Woo falló (fail-open):', res.status);
    }
  } catch (e) {
    console.warn('[checkout-guard] consulta a Woo falló (fail-open):', e);
  }

  return resultado;
}

/** Llamar DESPUÉS de crear el pedido: los intentos fallidos no consumen cupo. */
export function registrarCreacion(req: NextRequest, email?: string) {
  if (process.env.NODE_ENV === 'test' && process.env.CHECKOUT_GUARD_TEST !== '1') return;
  const ahora = Date.now();
  const ip = clientIp(req);
  if (ip) marcar(`ip:${ip}`, ahora, BURST_IP.ventanaMs);
  const em = (email ?? '').trim().toLowerCase();
  if (em) marcar(`em:${em}`, ahora, BURST_EMAIL.ventanaMs);
}

/** Solo para tests: limpia la memoria de ráfagas. */
export function _resetGuard() { ventanas.clear(); }
