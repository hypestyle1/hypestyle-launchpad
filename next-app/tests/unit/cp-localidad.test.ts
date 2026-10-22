import { describe, expect, it } from 'vitest';
import { localidadPorCp } from '@/lib/cp-localidad';

describe('localidadPorCp', () => {
  it('en CABA afirma el barrio solo con dominancia real (>= 80%)', async () => {
    expect(await localidadPorCp('1428')).toEqual({ ciudad: 'Belgrano', provincia: 'CABA' });
    expect(await localidadPorCp('1045')).toEqual({ ciudad: 'Balvanera', provincia: 'CABA' });
  });

  it('un CP repartido entre barrios queda sin barrio, con provincia', async () => {
    // 1414 es ~51% Villa Crespo y ~43% Palermo: prellenarlo sería adivinar.
    expect(await localidadPorCp('1414')).toEqual({ ciudad: '', provincia: 'CABA' });
    expect(await localidadPorCp('1425')).toEqual({ ciudad: '', provincia: 'CABA' });
  });

  it('acepta el CPA completo y lo normaliza', async () => {
    expect(await localidadPorCp('C1428DNV')).toEqual({ ciudad: 'Belgrano', provincia: 'CABA' });
  });

  it('resuelve ciudades cabecera conocidas', async () => {
    expect(await localidadPorCp('7600')).toEqual({ ciudad: 'Mar del Plata', provincia: 'Buenos Aires' });
    expect(await localidadPorCp('2000')).toEqual({ ciudad: 'Rosario', provincia: 'Santa Fe' });
    expect(await localidadPorCp('5000')).toEqual({ ciudad: 'Córdoba', provincia: 'Córdoba' });
    expect(await localidadPorCp('5500')).toEqual({ ciudad: 'Mendoza', provincia: 'Mendoza' });
  });

  it('cuando no hay cabecera deducible igual trae la provincia', async () => {
    const loc = await localidadPorCp('1629');
    expect(loc).not.toBeNull();
    expect(loc!.provincia).toBe('Buenos Aires');
    expect(loc!.ciudad).toBe('');
  });

  it('devuelve null para CPs incompletos o desconocidos', async () => {
    expect(await localidadPorCp('14')).toBeNull();
    expect(await localidadPorCp('')).toBeNull();
    expect(await localidadPorCp('0000')).toBeNull();
    expect(await localidadPorCp('SW1A 1AA')).toBeNull();
  });
});
