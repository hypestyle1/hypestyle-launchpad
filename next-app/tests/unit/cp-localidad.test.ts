import { describe, expect, it } from 'vitest';
import { localidadPorCp } from '@/lib/cp-localidad';

describe('localidadPorCp', () => {
  it('en CABA resuelve el barrio mayoritario del CP', async () => {
    expect(await localidadPorCp('1414')).toEqual({ ciudad: 'Villa Crespo', provincia: 'CABA' });
    expect(await localidadPorCp('1437')).toEqual({ ciudad: 'Nueva Pompeya', provincia: 'CABA' });
  });

  it('en CABA sin barrio dominante igual trae la provincia', async () => {
    expect(await localidadPorCp('1426')).toEqual({ ciudad: '', provincia: 'CABA' });
  });

  it('acepta el CPA completo y lo normaliza', async () => {
    expect(await localidadPorCp('C1414DNV')).toEqual({ ciudad: 'Villa Crespo', provincia: 'CABA' });
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
