import { normalizeCpAr } from '@/lib/postal-code';
import { isGiftCardItem } from '@/lib/gift-card';
import type { CampoInfo } from '@/lib/checkout-validacion';

/**
 * Validación de los datos de contacto del lado del servidor, antes de crear el
 * pedido en WooCommerce.
 *
 * Por qué existe: `lib/checkout-validacion.ts` corre solo en el navegador. Las
 * rutas `/api/create-order-gocuotas` y `/api/create-order-intl` son públicas y
 * sin auth, y el esquema de `wc/v3/orders` (verificado contra esta instalación
 * el 25/10/2026) valida únicamente `billing.email` por su `format: "email"`:
 * `phone`, `first_name`, `last_name` y `postcode` son `string` pelado, sin
 * ninguna comprobación. Un POST directo entra con el teléfono y el nombre que
 * quiera.
 *
 * Criterio, heredado del validador del navegador y de la auditoría del 25/10:
 * se bloquea solo lo **imposible**, nunca lo **raro**. Una venta perdida por un
 * validador estricto cuesta más que un dato feo. En concreto:
 *
 * - No hay reglas de charset: `Szczęsny`, `O'Brien`, `Ñandú`, cirílico y CJK
 *   pasan. El sitio está en tres idiomas y hay clientes rusos.
 * - No hay heurísticas sobre nombres. En los 1.089 pedidos de la auditoría del
 *   17/10 la heurística de nombre dio 8 falsos positivos que terminaron pagando.
 * - El teléfono se mide con el mínimo global de 7 dígitos, no con el argentino.
 * - Las reglas de DNI y de CP de 4 dígitos aplican solo cuando el país es AR.
 * - La sugerencia de dominios mal tipeados (`sugerirEmail`) **no está acá**:
 *   vive solo en el navegador y es la única fuente. Acá un `gmial.com` pasa.
 *
 * Cada hallazgo dice si está en el conjunto que se va a activar primero
 * (`bloquea`). En modo `bloquear` solo esos devuelven 422; el resto se registra
 * y el pedido se crea igual, indefinidamente, hasta que haya datos que
 * justifiquen otra cosa.
 */

export type ModoValidacion = 'observar' | 'bloquear';

/**
 * Interruptor de código. **Mientras sea `false`, ninguna configuración de
 * entorno puede hacer que el validador rechace un pedido en producción.**
 *
 * Por qué no alcanza con la variable `CHECKOUT_VALIDACION`: una variable de
 * entorno la puede poner cualquiera desde el dashboard de Vercel, se copia sin
 * pensar entre entornos (preview → producción) y no deja rastro en el repo.
 * Activar el bloqueo tiene que ser un cambio de código revisable, no un campo
 * de texto en un panel.
 *
 * Para activarlo hay que cambiar esta constante a `true` **en un PR**, y ese PR
 * tiene que traer también la regla de "nombre sin letras" en
 * `lib/checkout-validacion.ts`: es la única de las cuatro reglas más estricta
 * que el formulario, así que sin eso el aviso le aparecería a la persona en el
 * paso de pago en vez del paso 1. Hay un test que falla si se cambia esta
 * constante sin agregar esa regla, así que el candado no depende de que alguien
 * se acuerde.
 *
 * Y no se activa entre el 2 y el 4 de noviembre: la campaña es ventana cerrada.
 */
export const BLOQUEO_HABILITADO = false;

/**
 * `observar` (default): valida, registra el código del campo y crea el pedido
 * igual. `bloquear`: 422 y no se crea nada.
 *
 * Se lee en cada request, no al cargar el módulo, para que el valor no quede
 * congelado en una instancia tibia de la lambda.
 *
 * Hacen falta **dos** condiciones para bloquear, y una es código:
 * `CHECKOUT_VALIDACION=bloquear` más `BLOQUEO_HABILITADO` en `true`. En los
 * tests basta la variable, para que el camino del 422 se pueda ejercitar y los
 * tests de "cero llamadas externas" sigan midiendo lo que tienen que medir.
 */
export function modoValidacion(): ModoValidacion {
  const pedido = (process.env.CHECKOUT_VALIDACION || '').trim().toLowerCase() === 'bloquear';
  if (!pedido) return 'observar';
  if (BLOQUEO_HABILITADO) return 'bloquear';
  if (process.env.NODE_ENV === 'test') return 'bloquear';
  // Que no quede en silencio: si alguien puso la variable esperando que
  // bloquee, tiene que poder enterarse de por qué no pasó nada.
  console.warn('[validacion] CHECKOUT_VALIDACION=bloquear ignorado: BLOQUEO_HABILITADO es false en lib/validacion-cliente-servidor.ts');
  return 'observar';
}

export type Hallazgo = {
  campo: CampoInfo;
  /** Código estable, para logs y métricas. Nunca lleva el valor. */
  regla: string;
  /** Mensaje para la persona, en el tono del formulario. */
  mensaje: string;
  /** Está en las cuatro reglas objetivamente imposibles que se activan primero. */
  bloquea: boolean;
};

export type OpcionesValidacion = {
  /** El país no es AR: no aplican DNI ni CP de 4 dígitos, y el teléfono se mide con el mínimo global. */
  internacional: boolean;
  /**
   * Hay un envío físico nacional en juego, así que un CP vacío es un dato
   * imposible. Si el servidor no puede saberlo (pedido de solo gift cards, por
   * ejemplo), va en `false` y un CP vacío no bloquea: un CP presente pero
   * malformado sí, siempre.
   */
  requiereCp: boolean;
  /** Hay envío a domicilio nacional: recién ahí una dirección vacía es un dato imposible. */
  requiereDireccion: boolean;
};

export type ResultadoValidacion = {
  /**
   * El payload no trae un objeto `customer`. No es una regla de validación: es
   * una request malformada que hoy termina en un 500 al leer `customer.nombre`.
   * Se responde 422 en cualquier modo, porque no hay pedido posible que crear y
   * ningún checkout real manda esto.
   */
  customerAusente: boolean;
  hallazgos: Hallazgo[];
  /** Un mensaje por campo, para el cuerpo del 422. Solo de las reglas que bloquean. */
  errores: Partial<Record<CampoInfo, string>>;
  /** Códigos de todas las reglas que dieron, para el log y la meta de observación. */
  reglas: string[];
  /** Códigos de las reglas que bloquean. Vacío = el pedido pasa aunque haya hallazgos. */
  reglasQueBloquean: string[];
  telefono: TelefonoNormalizado;
};

// --- Teléfono -------------------------------------------------------------

export type TelefonoNormalizado = {
  /** Solo los dígitos, ya sin el prefijo internacional de salida (`00`). */
  digitos: string;
  /** Número nacional significativo argentino: 10 dígitos. `null` si no se reconoció. */
  nsnAr: string | null;
  /** E.164 reconstruido. Para validar y medir: en este PR **no se persiste**. */
  e164: string | null;
  /** Venía la marca de móvil: el `9` de `+549` o el `15` local. */
  movil: boolean;
};

/**
 * Códigos de área argentinos de 3 cifras (ENACOM). El resto se trata como de
 * 4 cifras, que es el caso más numeroso, y `11` es el único de 2.
 *
 * Para qué sirve la tabla: el número nacional significativo argentino tiene
 * siempre 10 dígitos, y el `15` de los móviles se escribe **después** del
 * código de área. Sin saber cuánto mide el código de área no se puede saber
 * dónde está el `15`: en `03442 15 123456` (área de 4 cifras) está en la
 * posición 4, y en `0351 15 4567890` (área de 3) en la 3.
 *
 * Propiedad importante: si un código de área se clasifica mal, el `15` no se
 * reconoce, `nsnAr` queda en `null` y el número se mide con sus dígitos
 * crudos. Eso puede hacer que **no** se emita una sugerencia, nunca que se
 * bloquee un número válido.
 */
const AREAS_AR_3_DIGITOS = new Set([
  '220', '221', '223', '230', '236', '237', '249', '260', '261', '263', '264',
  '266', '280', '291', '294', '297', '299', '341', '342', '343', '345', '348',
  '351', '353', '358', '362', '364', '370', '376', '379', '380', '381', '383',
  '385', '387', '388',
]);

function largoAreaAr(nsn: string): number {
  if (nsn.startsWith('11')) return 2;
  if (AREAS_AR_3_DIGITOS.has(nsn.slice(0, 3))) return 3;
  return 4;
}

/**
 * Normaliza un teléfono para poder medirlo. No reescribe lo que escribió la
 * persona: el valor original es el que se guarda en el pedido.
 *
 * Acepta todo lo que la gente escribe de verdad: `+54 9 11 4567-8900`,
 * `011 15 4567 8900`, `0351 15 4567890`, `03442 15 123456`, `1145678900`,
 * `+33 6 12 34 56 78`.
 */
export function normalizarTelefono(valor: unknown, internacional: boolean): TelefonoNormalizado {
  const crudo = typeof valor === 'string' || typeof valor === 'number' ? String(valor) : '';
  let d = crudo.replace(/\D/g, '');
  // Prefijo internacional de salida: "0054 ..." o "00 33 ...".
  if (d.startsWith('00')) d = d.slice(2);
  const digitosCrudos = d;
  if (internacional || !d) return { digitos: digitosCrudos, nsnAr: null, e164: null, movil: false };

  let movil = false;
  let conCodigoPais = false;
  // El 54 solo se saca si lo que queda puede ser un número nacional: ningún
  // código de área argentino empieza con 5.
  if (d.startsWith('54') && d.length > 10) {
    d = d.slice(2);
    conCodigoPais = true;
  }
  // Prefijo de larga distancia nacional.
  if (d.startsWith('0')) d = d.slice(1);
  // El 9 de los móviles en formato internacional: +54 9 11 4567 8900.
  if (conCodigoPais && d.startsWith('9') && d.length >= 11) {
    movil = true;
    d = d.slice(1);
  }
  // El 15 local, que va después del código de área: 011 15 4567 8900.
  if (d.length === 12) {
    const area = largoAreaAr(d);
    if (d.slice(area, area + 2) === '15') {
      movil = true;
      d = d.slice(0, area) + d.slice(area + 2);
    }
  }
  const nsnAr = d.length === 10 ? d : null;
  return {
    // Sin reconocer el formato, se mide con los dígitos tal como vinieron: es
    // el conteo honesto y no puede inventar un número que la persona no escribió.
    digitos: nsnAr ?? digitosCrudos,
    nsnAr,
    e164: nsnAr ? `+54${movil ? '9' : ''}${nsnAr}` : null,
    movil,
  };
}

// --- Validación -----------------------------------------------------------

/** Lo que llega por la API puede ser cualquier cosa: arrays, objetos, null. */
function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return String(valor);
  return '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIENE_LETRA = /\p{L}/u;
const CARACTER_DE_CONTROL = /[\u0000-\u001F\u007F]/;

const MAX_EMAIL = 254;
const MAX_LOCAL_EMAIL = 64;
const MAX_NOMBRE = 60;
/** Máximo de E.164. */
const MAX_DIGITOS_TELEFONO = 15;
const MIN_DIGITOS_TELEFONO = 7;

export function validarClienteServidor(
  customer: unknown,
  opts: OpcionesValidacion,
): ResultadoValidacion {
  const customerAusente = !customer || typeof customer !== 'object' || Array.isArray(customer);
  const c = (customerAusente ? {} : customer) as Record<string, unknown>;
  const en = opts.internacional;
  const hallazgos: Hallazgo[] = [];
  const add = (campo: CampoInfo, regla: string, mensaje: string, bloquea: boolean) =>
    hallazgos.push({ campo, regla, mensaje, bloquea });

  // Email. La sugerencia de typos no vive acá: un gmial.com pasa.
  const email = texto(c.email).trim();
  const msgEmail = en
    ? 'Enter a valid email so we can send your order confirmation.'
    : 'Ingresá un correo válido para recibir la confirmación del pedido.';
  if (!email) {
    add('email', 'email_vacio', msgEmail, true);
  } else if (!EMAIL_RE.test(email)) {
    add('email', 'email_sin_forma', msgEmail, true);
  } else {
    if (email.length > MAX_EMAIL) add('email', 'email_largo', msgEmail, false);
    if (email.slice(0, email.lastIndexOf('@')).length > MAX_LOCAL_EMAIL) {
      add('email', 'email_local_largo', msgEmail, false);
    }
  }

  // Nombre y apellido. Sin charset, sin heurísticas: vacío o sin ninguna letra.
  const msgNombre = en
    ? 'Check your first and last name so we can prepare the shipment.'
    : 'Revisá tu nombre y apellido para que podamos preparar el envío.';
  for (const campo of ['nombre', 'apellido'] as const) {
    const v = texto(c[campo]).trim();
    if (!v) {
      add(campo, `${campo}_vacio`, msgNombre, true);
      continue;
    }
    if (!TIENE_LETRA.test(v)) {
      add(campo, `${campo}_sin_letras`, msgNombre, true);
      continue;
    }
    if (v.length > MAX_NOMBRE) add(campo, `${campo}_largo`, msgNombre, false);
    if (CARACTER_DE_CONTROL.test(v)) add(campo, `${campo}_control`, msgNombre, false);
  }

  // Teléfono. Mínimo global de 7 dígitos; el argentino de 10 solo sugiere.
  const telefono = normalizarTelefono(c.telefono, en);
  const msgTelefono = en
    ? 'Check your phone number: it looks like some digits are missing.'
    : 'Revisá el teléfono: parece que faltan números.';
  if (!telefono.digitos) {
    add('telefono', 'telefono_vacio', msgTelefono, true);
  } else if (telefono.digitos.length < MIN_DIGITOS_TELEFONO) {
    add('telefono', 'telefono_corto', msgTelefono, true);
  } else if (telefono.digitos.length > MAX_DIGITOS_TELEFONO) {
    add('telefono', 'telefono_largo', msgTelefono, false);
  } else if (!en && !telefono.nsnAr && telefono.digitos.length <= 9) {
    // Nacional significativo son 10. Entre 7 y 9 falta algo, pero no se bloquea:
    // puede ser un número viejo de 6 cifras con área de 3 que ya no exista.
    add('telefono', 'telefono_ar_incompleto', msgTelefono, false);
  }

  // DNI: solo nacional, y la ausencia nunca interviene (los pedidos de solo
  // gift card no lo piden).
  if (!en) {
    const dni = texto(c.dni).replace(/\D/g, '');
    if (dni && (dni.length < 6 || dni.length > 9)) {
      add('dni', 'dni_fuera_de_rango', 'Revisá el DNI: tiene 7 u 8 números.', false);
    }
  }

  // CP. Nacional: los 4 dígitos que sabe leer Andreani; el CPA "C1425ABC" vale.
  const cp = texto(c.cp).trim();
  if (en) {
    if (!cp && opts.requiereCp) {
      add('cp', 'cp_intl_vacio', 'Enter your postal code.', false);
    }
  } else if (!cp) {
    if (opts.requiereCp) {
      add('cp', 'cp_vacio', 'El código postal tiene 4 números (ej. 1425).', true);
    }
  } else if (!/^\d{4}$/.test(normalizeCpAr(cp))) {
    add('cp', 'cp_invalido', 'El código postal tiene 4 números (ej. 1425).', true);
  }

  // Dirección: solo cuando hay envío a domicilio de verdad, y solo se registra.
  if (opts.requiereDireccion && !texto(c.direccion).trim()) {
    add('direccion', 'direccion_vacia', en ? 'Enter your address.' : 'Ingresá la calle y el número.', false);
  }

  const errores: Partial<Record<CampoInfo, string>> = {};
  for (const h of hallazgos) {
    if (h.bloquea && !errores[h.campo]) errores[h.campo] = h.mensaje;
  }

  return {
    customerAusente,
    hallazgos,
    errores,
    reglas: hallazgos.map((h) => h.regla),
    reglasQueBloquean: hallazgos.filter((h) => h.bloquea).map((h) => h.regla),
    telefono,
  };
}

/**
 * Deriva del payload las mismas condiciones que el formulario usa para decidir
 * qué campos pide (`camposVisibles`), sin una sola llamada de red: las gift
 * cards se reconocen por slug y la sucursal por el método de envío que mandó el
 * navegador. Así el servidor nunca exige un campo que el formulario no mostró.
 */
export function opcionesDesdePayload(
  payload: Record<string, unknown>,
  internacional: boolean,
): OpcionesValidacion {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const comprables = items.filter((it: any) => it?.isGift !== true);
  const soloGift = comprables.length > 0
    && comprables.every((it: any) => isGiftCardItem({ id: String(it?.id ?? '') }));
  const texto_ = (v: unknown) => (typeof v === 'string' ? v : '');
  const esSucursal = !!payload.shippingBranchCode
    || !!payload.shippingBranch
    || /sucursal/i.test(texto_(payload.shippingMethodId))
    || /sucursal/i.test(texto_(payload.shippingLabel));
  return {
    internacional,
    requiereCp: !soloGift,
    requiereDireccion: !soloGift && !esSucursal,
  };
}

/** Cuerpo del 422. Solo claves de campo y mensajes: ningún dato recibido vuelve. */
export const CODIGO_DATOS_INVALIDOS = 'datos_invalidos';

export function cuerpo422(errores: Partial<Record<CampoInfo, string>>, internacional: boolean) {
  return {
    codigo: CODIGO_DATOS_INVALIDOS,
    errores,
    message: internacional ? 'Check the form fields' : 'Revisá los datos del formulario',
  };
}

/**
 * Línea de log y meta de observación: solo códigos de regla, nunca el valor del
 * campo, ni el email, ni el teléfono, ni la IP.
 */
export function resumenParaLog(r: ResultadoValidacion, modo: ModoValidacion): string {
  return `[validacion] modo=${modo} reglas=${r.reglas.join(',') || 'ninguna'} bloquean=${r.reglasQueBloquean.join(',') || 'ninguna'}`;
}

/** Meta del pedido en modo observación: qué habría rechazado. Solo códigos. */
export const META_VALIDACION = '_hs_validacion';

export function metaValidacion(r: ResultadoValidacion): { key: string; value: string } | null {
  if (!r.reglas.length) return null;
  const bloquean = r.reglasQueBloquean.length ? `|bloquean:${r.reglasQueBloquean.join(',')}` : '';
  return { key: META_VALIDACION, value: `observar:${r.reglas.join(',')}${bloquean}`.slice(0, 190) };
}
