import { describe, it, expect } from 'vitest';
import { paisMayorista, validarTaxId, normalizeTaxId } from '@/lib/mayorista-paises';

describe('paisMayorista', () => {
  it('devuelve el país pedido', () => {
    expect(paisMayorista('CL').nombre).toBe('Chile');
    expect(paisMayorista('cl').taxLabel).toBe('RUT');
    expect(paisMayorista('CL').regionLabel).toBe('Región');
  });
  it('cae a Argentina con cualquier cosa', () => {
    expect(paisMayorista('ZZ').code).toBe('AR');
    expect(paisMayorista(undefined).code).toBe('AR');
    expect(paisMayorista(42).code).toBe('AR');
  });
});

describe('validarTaxId', () => {
  it('Argentina sigue exigiendo 11 dígitos', () => {
    expect(validarTaxId('AR', '20-12345678-9')).toBeNull();
    expect(validarTaxId('AR', '2012345678')).toMatch(/11 n/);
    expect(validarTaxId('AR', '')).toMatch(/11 n/);
  });
  it('afuera acepta el formato local, con guión y verificador', () => {
    expect(validarTaxId('CL', '76.543.210-K')).toBeNull();
    expect(validarTaxId('ES', 'B12345678')).toBeNull();
  });
  it('afuera igual pide algo razonable', () => {
    expect(validarTaxId('CL', '12')).toMatch(/RUT/);
    expect(validarTaxId('CL', '   ')).toMatch(/RUT/);
  });
});

describe('normalizeTaxId', () => {
  it('el CUIT se guarda solo con dígitos', () => {
    expect(normalizeTaxId('AR', '20-12345678-9')).toBe('20123456789');
  });
  it('el RUT conserva guión y verificador: perderlos es perder el dato', () => {
    expect(normalizeTaxId('CL', ' 76.543.210-K ')).toBe('76.543.210-K');
  });
});
