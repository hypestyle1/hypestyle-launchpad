/**
 * Cómo recibe el pedido el cliente, leído de una sola fuente y sin adivinar.
 *
 * El caso que lo motivó (#4054, 23/10/2026): el cliente preguntó si su pedido
 * iba a la sucursal de San Martín 2002 y el panel mostraba "arenales 2141,
 * Florida". Los datos estaban bien guardados —`_shipping_branch` decía
 * "PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002 — Gral José de San Martín
 * 2002, Florida" y `_shipping_branch_code` "HOP8754"—, pero el detalle del
 * pedido nunca los mostraba: pintaba `shipping.address_1`, que en un envío a
 * sucursal es la dirección de facturación copiada y no tiene nada que ver con
 * el destino. El dato existía; la pantalla no lo decía.
 *
 * Medido sobre los 1.132 pedidos de la base (25/10/2026):
 *   - 145 van a sucursal y los 145 tienen `_shipping_branch`; 141 tienen código.
 *   - los 4 sin código son los "A COORDINAR" (el checkout no encontró sucursales
 *     para el CP, o fueron pruebas): ahí falta el dato de verdad y se dice.
 *   - 884 van a domicilio y ninguno tiene meta de sucursal colgada.
 *   - 103 no tienen línea de envío (canje, retiro, carga manual).
 *
 * Nada de esto se infiere de la dirección: si falta el dato, se declara.
 */

import { envioDeOrden, metodoDef } from './mayorista-envio';

export type TipoEntrega =
  /** Andreani (u otro) a la dirección del cliente. */
  | 'domicilio'
  /** Andreani a una sucursal o Punto Hop elegido en el checkout. */
  | 'sucursal'
  /** Sucursal de un tercero (Via Cargo), del flujo mayorista. */
  | 'sucursal_tercero'
  /** Expreso a coordinar (mayorista). */
  | 'expreso'
  /** Fuera de Argentina: DHL, FedEx. */
  | 'internacional'
  /** Sin línea de envío: canje, retiro en el local o entrega en mano. */
  | 'sin_envio';

export interface SucursalElegida {
  /** "PUNTO ANDREANI HOP GRAL JOSÉ DE SAN MARTÍN 2002" */
  nombre: string;
  /** "Gral José de San Martín 2002, Florida" — vacío si el meta no la trae. */
  direccion: string;
  /** Código con el que el plugin de Andreani despacha ("HOP8754"). */
  codigo: string;
}

export interface Entrega {
  tipo: TipoEntrega;
  /** Para mostrar: "Sucursal Andreani", "A domicilio", "Sin envío". */
  etiqueta: string;
  /** `method_title` de la línea de envío de Woo, tal cual. */
  metodo: string;
  /** Tarifa elegida en el checkout (`_chosen_shipping`), que es lo que lee el plugin. */
  tarifa: string;
  /** Sólo en 'sucursal': la sucursal elegida. null si no hay dato. */
  sucursal: SucursalElegida | null;
  /** Destino del mayorista (sucursal de Via Cargo, expreso) en texto. */
  destino: string;
  /**
   * true cuando NO se puede afirmar a dónde va el pedido. La pantalla tiene que
   * decir "falta verificar" en vez de mostrar una dirección que no corresponde.
   */
  incompleto: boolean;
  /** Qué falta, en una línea, cuando incompleto. */
  faltante: string;
}

const ETIQUETAS: Record<TipoEntrega, string> = {
  domicilio:        'A domicilio',
  sucursal:         'Sucursal Andreani',
  sucursal_tercero: 'Sucursal de transporte',
  expreso:          'Expreso a coordinar',
  internacional:    'Envío internacional',
  sin_envio:        'Sin envío',
};

/** "NOMBRE — Dirección, Localidad" → las dos partes. Sin el separador, todo es nombre. */
export function parseSucursal(texto: string, codigo: string): SucursalElegida | null {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const i = t.indexOf('—');
  return i === -1
    ? { nombre: t, direccion: '', codigo: String(codigo ?? '').trim() }
    : { nombre: t.slice(0, i).trim(), direccion: t.slice(i + 1).trim(), codigo: String(codigo ?? '').trim() };
}

/**
 * El checkout guarda "A COORDINAR — ..." cuando Andreani no devolvió sucursales
 * para el código postal. Es un dato honesto, pero no es una sucursal: el pedido
 * no se puede despachar así.
 */
export function esSucursalSinDefinir(nombre: string): boolean {
  return /^a\s*coordinar/i.test((nombre || '').trim());
}

export function entregaDeOrden(
  shippingLines: { method_title?: string; method_id?: string }[] | null | undefined,
  getMeta: (key: string) => string,
): Entrega {
  const linea  = (shippingLines || [])[0];
  const metodo = String(linea?.method_title || '').trim();
  const tarifa = getMeta('_chosen_shipping');

  const base = { metodo, tarifa, sucursal: null as SucursalElegida | null, destino: '', incompleto: false, faltante: '' };

  // 1. Flujo mayorista: el cliente eligió el método a mano (lib/mayorista-envio).
  const may = envioDeOrden(getMeta);
  if (may.metodo) {
    const def  = metodoDef(may.metodo)!;
    const tipo: TipoEntrega = may.metodo === 'andreani_domicilio' ? 'domicilio'
      : may.metodo === 'via_cargo'         ? 'sucursal_tercero'
      : may.metodo === 'andreani_sucursal' ? 'sucursal'
      : 'expreso';
    const falta = def.destinoRequerido && !may.destino;
    return {
      ...base, tipo, etiqueta: def.label, destino: may.destino,
      sucursal: tipo === 'sucursal' ? parseSucursal(may.destino, getMeta('_shipping_branch_code')) : null,
      incompleto: falta,
      faltante: falta ? `falta ${def.destinoLabel!.toLowerCase()}` : '',
    };
  }

  // 2. A sucursal. La tarifa (`_chosen_shipping`) manda sobre el título, que es
  //    texto editable en Ajustes → Envíos y cambió varias veces.
  if (/sucursal/i.test(tarifa) || /sucursal/i.test(metodo)) {
    const suc = parseSucursal(getMeta('_shipping_branch'), getMeta('_shipping_branch_code'));
    const sinDefinir = !!suc && esSucursalSinDefinir(suc.nombre);
    return {
      ...base, tipo: 'sucursal', etiqueta: ETIQUETAS.sucursal,
      sucursal: sinDefinir ? null : suc,
      incompleto: !suc || sinDefinir || !suc.codigo,
      faltante: !suc
        ? 'el pedido va a sucursal pero no quedó guardada cuál: verificar con el cliente antes de despachar'
        : sinDefinir
          ? 'el checkout no encontró sucursales para ese código postal: hay que coordinar la sucursal con el cliente'
          : !suc.codigo
            ? 'falta el código de sucursal, que es con el que despacha Andreani'
            : '',
    };
  }

  // 3. Internacional.
  if (/dhl|fedex|international|internacional/i.test(metodo)) {
    return { ...base, tipo: 'internacional', etiqueta: ETIQUETAS.internacional };
  }

  // 4. Sin línea de envío: canje, retiro o entrega en mano. Cuál de las tres no
  //    está guardado en ninguna parte, así que no se adivina.
  if (!metodo) {
    return {
      ...base, tipo: 'sin_envio', etiqueta: ETIQUETAS.sin_envio,
      incompleto: true,
      faltante: 'el pedido no tiene método de envío: confirmar si es retiro, canje o entrega en mano',
    };
  }

  return { ...base, tipo: 'domicilio', etiqueta: ETIQUETAS.domicilio };
}

/* ─── Sucursal elegida vs destino real de la guía ─────────────────────────────
 * Andreani no devuelve el código de sucursal en el tracking público: devuelve
 * el nombre con otra forma ("Punto Andreani Hop Del Carmen 1515" contra
 * "PUNTO ANDREANI HOP DEL CARMEN 1515 — Del Carmen 1515, Cañuelas"). Comparar
 * los textos crudos da falsos positivos, así que se comparan los tokens que
 * identifican la sucursal: calle y número.
 *
 * Cruzado sobre los 82 pedidos a sucursal con guía (25/10/2026): 80 coinciden y
 * 2 todavía no tienen destino porque el paquete nunca entró al correo. Cero
 * discrepancias reales. Esta función es la que puede automatizar ese control.
 */

/** Saca ruido y deja los tokens que identifican la sucursal. */
function tokensSucursal(s: string): Set<string> {
  const limpio = String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\bpunto\b|\bandreani\b|\bhop\b|\bsucursal\b|\bcentro\b|\bgral\b|\bgeneral\b|\bav\b|\bavenida\b|\bcalle\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ');
  return new Set(limpio.split(' ').filter((t) => t.length > 2));
}

export type ComparacionSucursal = 'coincide' | 'difiere' | 'sin_datos';

/**
 * Compara la sucursal elegida con el destino que informa el tracking.
 * 'sin_datos' cuando falta alguno de los dos: no se afirma nada.
 */
export function compararSucursal(elegida: string, destinoGuia: string): ComparacionSucursal {
  // Sólo el NOMBRE de la sucursal: `_shipping_branch` guarda "NOMBRE — dirección"
  // y el tracking devuelve el nombre canónico. Comparar también la dirección
  // metía tokens que el tracking nunca trae ("Esq 40", "Local 24") y daba por
  // distintas 10 de 82 sucursales que eran la misma.
  const A = tokensSucursal(String(elegida ?? '').split('—')[0]);
  const B = tokensSucursal(destinoGuia);
  if (!A.size || !B.size) return 'sin_datos';
  // Jaccard, no coincidencia sobre el conjunto chico: "San Martín" es una calle
  // de casi toda ciudad del país, y con el criterio laxo "HOP San Martín 2002,
  // Florida" daba por igual a "Mendoza (av San Martin)".
  let comunes = 0;
  for (const t of A) if (B.has(t)) comunes++;
  const union = new Set([...A, ...B]).size;
  return comunes / union >= 0.6 ? 'coincide' : 'difiere';
}
