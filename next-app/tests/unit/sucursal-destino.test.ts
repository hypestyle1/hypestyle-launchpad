import { describe, it, expect } from 'vitest';
import { destinoSucursal, esEnvioASucursal, parsearSucursalTexto } from '@/lib/sucursal-destino';

/**
 * El destino de un envío a sucursal. Desde el checkout adaptativo (#601) el
 * comprador que retira en sucursal no deja domicilio, y el plugin de Andreani
 * exige dirección + ciudad para emitir la guía: sin esto el pedido no se puede
 * despachar (caso #4057).
 */
describe('destinoSucursal', () => {
  it('usa los campos sueltos de la sucursal elegida', () => {
    expect(destinoSucursal({ calle: 'Sarmiento 128', localidad: 'Comodoro Rivadavia' }))
      .toEqual({ calle: 'Sarmiento 128', localidad: 'Comodoro Rivadavia' });
  });

  it('sin campos sueltos, parsea el texto guardado en _shipping_branch', () => {
    expect(destinoSucursal({ texto: 'COMODORO RIVADAVIA (CENTRO) — Sarmiento 128, Comodoro Rivadavia' }))
      .toEqual({ calle: 'Sarmiento 128', localidad: 'Comodoro Rivadavia' });
  });

  it('una calle con coma propia no pierde el número: la localidad es lo último', () => {
    expect(parsearSucursalTexto('CORDOBA (AV SABATTINI) — Av. Amadeo Sabattini 1647, Cordoba'))
      .toEqual({ calle: 'Av. Amadeo Sabattini 1647', localidad: 'Cordoba' });
  });

  it('sin localidad en el texto, la calle igual sirve', () => {
    expect(parsearSucursalTexto('SUCURSAL X — Perú 628')).toEqual({ calle: 'Perú 628', localidad: '' });
  });

  it('"A COORDINAR" no es una dirección: no se inventa destino', () => {
    expect(parsearSucursalTexto('A COORDINAR — no se encontraron sucursales para el CP')).toBeNull();
    expect(destinoSucursal({ texto: 'A COORDINAR — no se encontraron sucursales para el CP' })).toBeNull();
  });

  it('sin sucursal no hay destino', () => {
    expect(destinoSucursal({})).toBeNull();
    expect(parsearSucursalTexto('')).toBeNull();
    expect(parsearSucursalTexto(null)).toBeNull();
  });
});

describe('esEnvioASucursal', () => {
  it('reconoce la tarifa y la etiqueta', () => {
    expect(esEnvioASucursal('andreani_pyme_sucursal', 'Andreani (sucursal)')).toBe(true);
    expect(esEnvioASucursal(undefined, 'Andreani (sucursal)')).toBe(true);
    expect(esEnvioASucursal('andreani_pyme_estándar', 'Andreani (estándar)')).toBe(false);
    expect(esEnvioASucursal(null, undefined)).toBe(false);
  });
});
