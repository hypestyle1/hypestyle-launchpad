/**
 * Destino de un envío a sucursal.
 *
 * Desde el checkout adaptativo (#601) el retiro en sucursal no pide la
 * dirección del comprador: el paquete no va a su casa. El plugin de Andreani,
 * en cambio, exige dirección + ciudad + CP para CUALQUIER envío —también el de
 * sucursal— y frena el pedido antes de llamar a la API
 * (`Andreani_Order_Mapper::get_destination_data` → `andreani_destination_incomplete`).
 *
 * El destino real de un envío a sucursal es la sucursal, así que es su calle y
 * su localidad lo que va en el bloque de envío del pedido. Además, al quedar
 * distinto del de facturación, el plugin toma ese bloque (`use_shipping`) y no
 * el de facturación, que sigue siendo el domicilio real del cliente o vacío.
 */
export type DestinoSucursal = { calle: string; localidad: string };

/** La sucursal la elige el cliente; sin sucursal no hay destino que escribir. */
const SIN_SUCURSAL = /^A COORDINAR/i;

/**
 * El texto que guarda `_shipping_branch` es `"NOMBRE — Calle 1234, Localidad"`.
 * Es lo único que llega desde un bundle viejo todavía abierto en un navegador,
 * así que sirve de respaldo cuando no vienen los campos sueltos.
 */
export function parsearSucursalTexto(texto?: string | null): DestinoSucursal | null {
  const t = (texto ?? '').trim();
  if (!t || SIN_SUCURSAL.test(t)) return null;

  const guion = t.indexOf('—');
  const direccion = (guion >= 0 ? t.slice(guion + 1) : t).trim();
  if (!direccion) return null;

  // La localidad va al final, después de la última coma ("Av. Sabattini 1647,
  // Cordoba"). Sin coma, todo es la calle.
  const coma = direccion.lastIndexOf(',');
  const calle = (coma >= 0 ? direccion.slice(0, coma) : direccion).trim();
  const localidad = coma >= 0 ? direccion.slice(coma + 1).trim() : '';
  return calle ? { calle, localidad } : null;
}

/** Campos sueltos de la sucursal elegida; si no vinieron, se parsea el texto. */
export function destinoSucursal(opts: {
  calle?: string | null;
  localidad?: string | null;
  texto?: string | null;
}): DestinoSucursal | null {
  const calle = (opts.calle ?? '').trim();
  if (calle) return { calle, localidad: (opts.localidad ?? '').trim() };
  return parsearSucursalTexto(opts.texto);
}

/** `andreani_pyme_sucursal` / "Andreani (sucursal)": tarifa o etiqueta. */
export function esEnvioASucursal(...valores: Array<string | null | undefined>): boolean {
  return valores.some((v) => /sucursal/i.test(String(v ?? '')));
}
