import { describe, expect, it } from 'vitest';
import { sugerirEmail, validarCampo, validarInfo, type DatosInfo } from '@/lib/checkout-validacion';

const AR = { soloGift: false, internacional: false, provinciaObligatoria: false };
const base: DatosInfo = {
  email: 'test@hypestyle.com.ar', nombre: 'Test', apellido: 'Comprador', dni: '30111222',
  direccion: 'Av. Siempreviva 742', cp: '1425', ciudad: 'Buenos Aires', provincia: 'CABA',
  telefono: '1145678900', pais: 'AR',
};

describe('validarInfo', () => {
  it('un pedido completo no tiene errores', () => {
    expect(validarInfo(base, AR)).toEqual({});
  });

  it('marca todos los vacíos de una', () => {
    const vacio = { ...base, email: '', nombre: '', dni: '', cp: '' };
    expect(Object.keys(validarInfo(vacio, AR)).sort()).toEqual(['cp', 'dni', 'email', 'nombre']);
  });

  it('gift card sola no pide dirección, DNI ni CP', () => {
    const gift = { ...base, dni: '', direccion: '', cp: '', ciudad: '' };
    expect(validarInfo(gift, { ...AR, soloGift: true })).toEqual({});
  });

  it('internacional no pide DNI y la provincia depende del país', () => {
    const intl = { ...base, dni: '', provincia: '', cp: 'SW1A 1AA', pais: 'GB' };
    const opts = { soloGift: false, internacional: true, provinciaObligatoria: false };
    expect(validarInfo(intl, opts)).toEqual({});
    expect(validarInfo(intl, { ...opts, provinciaObligatoria: true })).toHaveProperty('provincia');
  });
});

describe('validarCampo', () => {
  it('email sin dominio completo', () => {
    expect(validarCampo('email', { ...base, email: 'juan@gmail' }, AR)).toMatch(/incompleto/);
    expect(validarCampo('email', { ...base, email: 'juan@gmail.com' }, AR)).toBeNull();
  });

  it('DNI acepta puntos y pide 7 u 8 números', () => {
    expect(validarCampo('dni', { ...base, dni: '30.111.222' }, AR)).toBeNull();
    expect(validarCampo('dni', { ...base, dni: '7123456' }, AR)).toBeNull();
    expect(validarCampo('dni', { ...base, dni: '123' }, AR)).toMatch(/7 u 8/);
  });

  it('CP: 4 dígitos o CPA; otra cosa no', () => {
    expect(validarCampo('cp', { ...base, cp: 'C1425ABC' }, AR)).toBeNull();
    expect(validarCampo('cp', { ...base, cp: '142' }, AR)).toMatch(/4 números/);
  });

  it('teléfono necesita el código de área', () => {
    expect(validarCampo('telefono', { ...base, telefono: '4567890' }, AR)).toMatch(/código de área/);
    expect(validarCampo('telefono', { ...base, telefono: '11 4567-8900' }, AR)).toBeNull();
  });
});

describe('sugerirEmail', () => {
  it('corrige dominios mal tipeados', () => {
    expect(sugerirEmail('Valen@gmial.com')).toBe('valen@gmail.com');
    expect(sugerirEmail('valen@hotmail.con')).toBe('valen@hotmail.com');
  });

  it('no sugiere nada con un dominio correcto o desconocido', () => {
    expect(sugerirEmail('valen@gmail.com')).toBeNull();
    expect(sugerirEmail('valen@hypestyle.com.ar')).toBeNull();
    expect(sugerirEmail('sin-arroba')).toBeNull();
  });
});
