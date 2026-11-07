import { describe, it, expect } from 'vitest';
import { envioDesdeCupon, normalizarCodigoCupon, META_ALCANCE_ENVIO } from '@/lib/cupon-envio-gratis';

describe('envioDesdeCupon (respuesta de WC REST /coupons)', () => {
  it('sin envío gratis: nada', () => {
    expect(envioDesdeCupon({ free_shipping: false, meta_data: [{ key: META_ALCANCE_ENVIO, value: 'sucursal' }] }))
      .toEqual({ gratis: false, soloSucursal: false });
    expect(envioDesdeCupon(null)).toEqual({ gratis: false, soloSucursal: false });
  });
  it('envío gratis sin meta: cubre todos los modos, como siempre', () => {
    expect(envioDesdeCupon({ free_shipping: true, meta_data: [] })).toEqual({ gratis: true, soloSucursal: false });
    expect(envioDesdeCupon({ free_shipping: true })).toEqual({ gratis: true, soloSucursal: false });
  });
  it('envío gratis + meta sucursal: solo sucursal', () => {
    expect(envioDesdeCupon({ free_shipping: true, meta_data: [{ key: META_ALCANCE_ENVIO, value: 'sucursal' }] }))
      .toEqual({ gratis: true, soloSucursal: true });
    expect(envioDesdeCupon({ free_shipping: true, meta_data: [{ key: META_ALCANCE_ENVIO, value: ' Sucursal ' }] }).soloSucursal).toBe(true);
  });
  it('otro valor de meta no acota', () => {
    expect(envioDesdeCupon({ free_shipping: true, meta_data: [{ key: META_ALCANCE_ENVIO, value: 'todos' }] }).soloSucursal).toBe(false);
  });
});

describe('normalizarCodigoCupon', () => {
  it('saca tildes y espacios: PERDÓN y perdón valen como PERDON', () => {
    expect(normalizarCodigoCupon('PERDÓN')).toBe('PERDON');
    expect(normalizarCodigoCupon('  perdón ')).toBe('perdon');
    expect(normalizarCodigoCupon('HYPE10')).toBe('HYPE10');
    expect(normalizarCodigoCupon(undefined)).toBe('');
  });
});
