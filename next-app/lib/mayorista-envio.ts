// Cómo quiere recibir el pedido un mayorista. Lo elige él en el checkout:
// Via Cargo (lo habitual), Andreani a domicilio o a sucursal, o un expreso que
// se coordina aparte (ej. TAS). Antes solo existía la sucursal de Via Cargo
// como texto obligatorio, y los que no usaban Via Cargo tenían que inventarla.
//
// En la orden queda en `_envio_metodo` + `_envio_destino`. Si es Via Cargo se
// sigue escribiendo `_via_cargo_sucursal`, y las órdenes viejas que solo tienen
// esa meta se leen como Via Cargo.

export type MetodoEnvio = 'via_cargo' | 'andreani_domicilio' | 'andreani_sucursal' | 'expreso';

export interface MetodoEnvioDef {
  id: MetodoEnvio;
  label: string;
  /** Rótulo del campo de destino; null = no hace falta (va a la dirección). */
  destinoLabel: string | null;
  destinoPlaceholder?: string;
  destinoRequerido: boolean;
}

export const METODOS_ENVIO: MetodoEnvioDef[] = [
  { id: 'via_cargo', label: 'Via Cargo — a sucursal', destinoLabel: 'Sucursal de Via Cargo', destinoPlaceholder: 'Ej: Via Cargo Comodoro Rivadavia centro', destinoRequerido: true },
  { id: 'andreani_domicilio', label: 'Andreani — a domicilio', destinoLabel: null, destinoRequerido: false },
  { id: 'andreani_sucursal', label: 'Andreani — a sucursal', destinoLabel: 'Sucursal de Andreani', destinoPlaceholder: 'Ej: Andreani Olavarría centro', destinoRequerido: true },
  { id: 'expreso', label: 'Expreso a coordinar', destinoLabel: 'Expreso que usás', destinoPlaceholder: 'Ej: TAS (si no sabés, lo coordinamos)', destinoRequerido: false },
];

export const METODO_DEFAULT: MetodoEnvio = 'via_cargo';

export function metodoDef(id: string | null | undefined): MetodoEnvioDef | null {
  return METODOS_ENVIO.find((m) => m.id === id) ?? null;
}

/** Error para mostrar, o null si el método y el destino alcanzan. */
export function validarEnvio(metodo: string | null | undefined, destino: string | null | undefined): string | null {
  const def = metodoDef(metodo);
  if (!def) return 'Elegí cómo querés recibir el pedido';
  if (def.destinoRequerido && !(destino ?? '').trim()) return `Falta la ${def.destinoLabel!.toLowerCase()}`;
  return null;
}

/** Línea corta para mails, admin y rótulo: "Via Cargo — a sucursal · Olavarría centro". */
export function envioResumen(metodo: string | null | undefined, destino: string | null | undefined): string {
  const def = metodoDef(metodo);
  if (!def) return '';
  const d = (destino ?? '').trim();
  if (!def.destinoLabel) return def.label;
  if (!d) return def.id === 'expreso' ? `${def.label} (a definir)` : def.label;
  return `${def.label} · ${d}`;
}

/** Lee el envío de la meta de una orden, con compatibilidad para las viejas. */
export function envioDeOrden(getMeta: (key: string) => string): { metodo: MetodoEnvio | null; destino: string; resumen: string } {
  let metodo = metodoDef(getMeta('_envio_metodo'))?.id ?? null;
  let destino = getMeta('_envio_destino');
  if (!metodo && getMeta('_via_cargo_sucursal')) {
    metodo = 'via_cargo';
    destino = getMeta('_via_cargo_sucursal');
  }
  return { metodo, destino, resumen: envioResumen(metodo, destino) };
}

/** Meta de la orden para el envío elegido. */
export function envioOrderMeta(metodo: MetodoEnvio, destino: string): { key: string; value: string }[] {
  const d = destino.trim();
  const meta = [
    { key: '_envio_metodo', value: metodo },
    { key: '_envio_destino', value: d },
  ];
  if (metodo === 'via_cargo') meta.push({ key: '_via_cargo_sucursal', value: d });
  return meta;
}
