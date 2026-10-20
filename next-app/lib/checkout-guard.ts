/**
 * Protección del checkout — parte pura (auditoría 17/10).
 *
 * Tres piezas, todas sin estado y testeables:
 *  - validarClienteServidor: la validación que hasta ahora vivía solo en el
 *    navegador (lib/checkout-validacion.ts), como red de seguridad del lado
 *    servidor. Criterio igual de laxo que el del form: bloquear solo lo que
 *    seguro es basura; un dato raro pero posible pasa — una venta perdida por
 *    un validador estricto cuesta más que un dato feo.
 *  - riesgoCliente: señales de datos inventados (tecleo al azar, teléfonos de
 *    un solo dígito). NUNCA bloquea: solo etiqueta el pedido (_hs_riesgo) para
 *    revisión humana y alertas.
 *  - excedeVentana / contarPedidosRecientes / decidirBloqueo: la aritmética
 *    del rate limit. El estado (memoria por instancia + consulta a Woo) vive
 *    en checkout-guard-server.ts.
 */

export type ClienteCheckout = {
  email?: string; nombre?: string; apellido?: string;
  telefono?: string; dni?: string;
};

// Mismo criterio que checkout-validacion.ts (el form del checkout).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const digitos = (v: string) => v.replace(/\D/g, '');

/** Motivo del rechazo, o null si los datos alcanzan para crear el pedido. */
export function validarClienteServidor(c: ClienteCheckout, internacional: boolean): string | null {
  const email = (c.email ?? '').trim();
  const nombre = (c.nombre ?? '').trim();
  const apellido = (c.apellido ?? '').trim();
  const tel = digitos(c.telefono ?? '');
  const dni = (c.dni ?? '').trim();

  // Campos absurdamente largos: nadie se llama así, pero un script sí.
  for (const v of [email, nombre, apellido, c.telefono ?? '', dni]) {
    if (v.length > 200) return 'Revisá los datos del formulario';
  }
  if (!EMAIL_RE.test(email)) return internacional ? 'Check your email, it looks incomplete' : 'Revisá el email, parece incompleto';
  if (!nombre)   return internacional ? 'Enter your first name' : 'Ingresá tu nombre';
  if (!apellido) return internacional ? 'Enter your last name' : 'Ingresá tu apellido';
  if (tel.length < (internacional ? 6 : 8)) {
    return internacional ? 'Include the country and area code' : 'Sumá el código de área en el teléfono (ej. 11 4567 8900)';
  }
  // El form exige DNI de 7-8 dígitos en pedidos nacionales; acá apenas más
  // laxo (6-9) para no rechazar pedidos viejos de apps o un guión de más.
  if (!internacional && dni && !/^\d{6,9}$/.test(digitos(dni))) {
    return 'El DNI tiene 7 u 8 números';
  }
  return null;
}

/* ─── Señales de riesgo (solo etiquetan, nunca bloquean) ───────────────── */

const VOCALES = 'aeiouáéíóúü';

/** 0..1: pinta de tecleo al azar ("Djskskkf", "jsksks"). */
function pintaDeMash(s: string): number {
  const letras = s.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (letras.length < 5) return 0;
  let vocales = 0, racha = 0, rachaMax = 0;
  for (const ch of letras) {
    if (VOCALES.includes(ch)) { vocales++; racha = 0; }
    else { racha++; rachaMax = Math.max(rachaMax, racha); }
  }
  const ratioVocales = vocales / letras.length;
  let score = 0;
  if (ratioVocales < 0.18) score += 0.5;
  if (rachaMax >= 5) score += 0.4;
  if (/(.)\1{3,}/.test(letras)) score += 0.3;
  return Math.min(score, 1);
}

export function riesgoCliente(c: ClienteCheckout): { alto: boolean; motivos: string[] } {
  const motivos: string[] = [];
  let score = 0;

  const nombreCompleto = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
  if (pintaDeMash(nombreCompleto) >= 0.5) { score += 2; motivos.push('nombre con pinta de tecleo al azar'); }

  const tel = digitos(c.telefono ?? '');
  const ultimos = tel.slice(-8);
  if (ultimos && new Set(ultimos).size <= 2) { score += 2; motivos.push('teléfono con dígitos repetidos'); }

  const dni = digitos(c.dni ?? '');
  if (dni && new Set(dni).size <= 2) { score += 1; motivos.push('DNI con dígitos repetidos'); }

  const local = (c.email ?? '').split('@')[0] ?? '';
  if (pintaDeMash(local) >= 0.5) { score += 1; motivos.push('email con pinta de tecleo al azar'); }

  return { alto: score >= 3, motivos };
}

/* ─── Rate limit — aritmética pura ─────────────────────────────────────── */

export type Ventana = { max: number; ventanaMs: number };

/** true si sumar un evento ahora excede la ventana. */
export function excedeVentana(timestamps: number[], ahora: number, v: Ventana): boolean {
  const desde = ahora - v.ventanaMs;
  return timestamps.filter((t) => t > desde).length >= v.max;
}

type PedidoReciente = {
  billing?: { email?: string };
  meta_data?: { key?: string; value?: unknown }[];
};

/** Cuenta pedidos del último rato que comparten email o IP con el entrante. */
export function contarPedidosRecientes(
  pedidos: PedidoReciente[],
  quien: { email?: string; ip?: string | null },
): { porEmail: number; porIp: number } {
  const email = (quien.email ?? '').trim().toLowerCase();
  let porEmail = 0, porIp = 0;
  for (const p of pedidos) {
    if (email && (p.billing?.email ?? '').trim().toLowerCase() === email) porEmail++;
    if (quien.ip) {
      const ipMeta = (p.meta_data ?? []).find((m) => m.key === '_hs_client_ip');
      if (ipMeta && String(ipMeta.value) === quien.ip) porIp++;
    }
  }
  return { porEmail, porIp };
}

export type LimitesHora = { email: number; ip: number };

/**
 * Límites de la última hora contra Woo (el store compartido entre instancias).
 * Generosos a propósito: una familia o una oficina detrás del mismo NAT
 * comprando a la vez no debe trabarse — esto frena scripts, no clientes.
 */
export function decidirBloqueo(conteo: { porEmail: number; porIp: number }, limites: LimitesHora): string | null {
  if (conteo.porEmail >= limites.email) return `email con ${conteo.porEmail} pedidos en la última hora`;
  if (conteo.porIp >= limites.ip) return `IP con ${conteo.porIp} pedidos en la última hora`;
  return null;
}
