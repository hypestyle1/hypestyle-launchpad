import { describe, it, expect } from 'vitest';
import { parseConsignacion, consignacionMetaEntry, splitConsignacion, validarPct, META_CONSIGNACION } from '@/lib/mayorista-consignacion';

const meta = (value: unknown) => [{ key: META_CONSIGNACION, value }] as { key: string; value: unknown }[];

describe('parseConsignacion', () => {
  it('lee el acuerdo guardado', () => {
    expect(parseConsignacion(meta(JSON.stringify({ pct: 25, desde: '2026-10-28', nota: 'Bizarre' }))))
      .toEqual({ pct: 25, desde: '2026-10-28', nota: 'Bizarre' });
  });
  it('sin meta, la cuenta es de compra normal', () => {
    expect(parseConsignacion([])).toBeNull();
    expect(parseConsignacion(undefined)).toBeNull();
    expect(parseConsignacion(meta(''))).toBeNull();
  });
  it('un porcentaje roto cae a cuenta normal, no a consignación al 0%', () => {
    expect(parseConsignacion(meta(JSON.stringify({ pct: 0 })))).toBeNull();
    expect(parseConsignacion(meta(JSON.stringify({ pct: 120 })))).toBeNull();
    expect(parseConsignacion(meta(JSON.stringify({ pct: 'veinticinco' })))).toBeNull();
    expect(parseConsignacion(meta('{roto'))).toBeNull();
  });
});

describe('consignacionMetaEntry', () => {
  it('ida y vuelta', () => {
    const c = { pct: 30, desde: '2026-11-01' };
    expect(parseConsignacion([consignacionMetaEntry(c)])).toEqual(c);
  });
  it('null borra el acuerdo', () => {
    expect(consignacionMetaEntry(null)).toEqual({ key: META_CONSIGNACION, value: '' });
  });
});

describe('validarPct', () => {
  it('acepta entre 1 y 99', () => {
    expect(validarPct(25)).toBeNull();
    expect(validarPct(1)).toBeNull();
    expect(validarPct(99)).toBeNull();
  });
  it('rechaza el resto', () => {
    expect(validarPct(0)).not.toBeNull();
    expect(validarPct(100)).not.toBeNull();
    expect(validarPct(-5)).not.toBeNull();
    expect(validarPct('25')).not.toBeNull();
    expect(validarPct(NaN)).not.toBeNull();
  });
});

describe('splitConsignacion', () => {
  it('reparte el precio de lista', () => {
    expect(splitConsignacion(100000, 25)).toEqual({ lista: 100000, comision: 25000, aLiquidar: 75000 });
  });
  it('las dos partes suman siempre el precio de lista', () => {
    for (const lista of [45900, 110000, 33333, 1]) {
      for (const pct of [25, 30, 33, 7]) {
        const s = splitConsignacion(lista, pct);
        expect(s.comision + s.aLiquidar).toBe(lista);
      }
    }
  });
});
