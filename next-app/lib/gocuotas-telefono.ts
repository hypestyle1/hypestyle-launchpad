/**
 * Teléfono para GOcuotas.
 *
 * GOcuotas valida al comprador mandando un SMS al número que le pasamos al
 * crear el checkout, y en esa pantalla no se puede corregir (recorrido del
 * 9/11/2026, `_claude/auditorias/gocuotas-fallas-2026-11.md`). Con un número
 * mal cargado el SMS no llega y la persona queda trabada: de 1/8 a 9/11, los
 * pedidos con largo inválido (8, 9 u 11 dígitos) fallaron todos. Por eso, para
 * este medio, el celular tiene que ser un número argentino completo antes de
 * crear el pedido, y el error se muestra en el checkout, no en GOcuotas.
 *
 * La normalización es la del resto del checkout (`normalizarTelefono`): saca el
 * 0, el 15, el +54 y el 9, así que `+54 9 11 4567-8900`, `011 15 4567 8900` y
 * `541145678900` (el 54 sin el 9, que antes viajaba tal cual) dan lo mismo.
 */
import { normalizarTelefono } from '@/lib/validacion-cliente-servidor';

export const MENSAJE_TELEFONO_GOCUOTAS =
  'Para pagar con GOcuotas necesitamos tu celular completo: código de área y número, sin 0 ni 15 (10 números, por ejemplo 11 2345 6789). Ahí te llega el SMS para validar.';

export type TelefonoGocuotas =
  | { ok: true; /** Formato que se le manda a GOcuotas: 549 + 10 dígitos. */ phone: string; /** Los 10 dígitos. */ nacional: string }
  | { ok: false; error: string };

export function telefonoGocuotas(valor: unknown): TelefonoGocuotas {
  const { nsnAr } = normalizarTelefono(valor, false);
  if (!nsnAr) return { ok: false, error: MENSAJE_TELEFONO_GOCUOTAS };
  return { ok: true, phone: `549${nsnAr}`, nacional: nsnAr };
}
