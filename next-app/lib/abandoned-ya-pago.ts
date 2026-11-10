/**
 * ¿La persona de un pedido sin pagar ya compró por otro lado?
 *
 * Cada reintento de pago crea un pedido nuevo. En el Cyber 2026, 16 de 19
 * personas con un GOcuotas "fallido" terminaron pagando (otro intento de
 * GOcuotas, tarjeta o transferencia), y el pedido viejo seguía en `failed` o
 * `pending`. Sin este filtro, el mail de carrito abandonado le escribía
 * "¿te olvidaste algo?" a quien ya había comprado.
 *
 * Mismo criterio que `_claude/herramientas/recuperacion-whatsapp.mjs`: es la
 * misma persona si coincide el mail, el teléfono (normalizado a los 10 dígitos
 * argentinos) o el DNI, y cuenta un pedido pagado (o con la transferencia en
 * revisión) creado ese mismo día o después del que quedó sin pagar.
 */
import { normalizarTelefono } from '@/lib/validacion-cliente-servidor';

export const ESTADOS_PAGADO = ['processing', 'completed', 'on-hold'] as const;

export interface PedidoPersona {
  id: number;
  number?: string;
  status?: string;
  date_created?: string;
  billing?: { email?: string; phone?: string };
  meta_data?: { key: string; value: unknown }[];
}

const email = (o: PedidoPersona) => (o.billing?.email || '').toLowerCase().trim();
const tel = (o: PedidoPersona) => normalizarTelefono(o.billing?.phone || '', false).nsnAr;
const dni = (o: PedidoPersona) => {
  const v = (o.meta_data || []).find(m => m.key === '_billing_dni')?.value;
  const d = typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\D/g, '') : '';
  return d.length >= 6 ? d : null;
};

/** El pedido pagado de esa misma persona, o null. */
export function pagoDeLaMismaPersona(pendiente: PedidoPersona, pagados: PedidoPersona[]): PedidoPersona | null {
  const e = email(pendiente), t = tel(pendiente), d = dni(pendiente);
  const desde = (pendiente.date_created || '').slice(0, 10);
  for (const p of pagados) {
    if (p.id === pendiente.id) continue;
    if (p.status && !(ESTADOS_PAGADO as readonly string[]).includes(p.status)) continue;
    if (desde && (p.date_created || '') < desde) continue;
    if ((e && email(p) === e) || (t && tel(p) === t) || (d && dni(p) === d)) return p;
  }
  return null;
}
