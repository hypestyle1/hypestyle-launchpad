import { describe, it, expect } from 'vitest';
import { parseCredit, creditToApply, addMovement, creditMetaEntry, CREDIT_META } from '@/lib/mayorista-credit';

describe('parseCredit', () => {
  it('sin meta, saldo cero', () => {
    expect(parseCredit([])).toEqual({ saldo: 0, movimientos: [] });
    expect(parseCredit(undefined)).toEqual({ saldo: 0, movimientos: [] });
  });

  it('lee el JSON guardado como string', () => {
    const state = { saldo: 46000, movimientos: [{ fecha: '2026-09-24', monto: 46000, motivo: 'Falla', orden: '3246' }] };
    expect(parseCredit([creditMetaEntry(state)])).toEqual(state);
  });

  it('acepta el valor ya parseado y descarta basura', () => {
    expect(parseCredit([{ key: CREDIT_META, value: { saldo: 100, movimientos: [] } }]).saldo).toBe(100);
    expect(parseCredit([{ key: CREDIT_META, value: '{roto' }]).saldo).toBe(0);
    expect(parseCredit([{ key: CREDIT_META, value: '{"saldo":-5}' }]).saldo).toBe(0);
  });
});

describe('creditToApply', () => {
  it('aplica el saldo entero si el pedido lo cubre', () => {
    expect(creditToApply(46000, 600000)).toBe(46000);
  });
  it('nunca más que el pedido', () => {
    expect(creditToApply(46000, 30000)).toBe(30000);
  });
  it('sin saldo o sin pedido, nada', () => {
    expect(creditToApply(0, 1000)).toBe(0);
    expect(creditToApply(1000, 0)).toBe(0);
  });
});

describe('addMovement', () => {
  it('carga y usa, sin bajar de cero', () => {
    let s = addMovement({ saldo: 0, movimientos: [] }, { fecha: 'a', monto: 46000, motivo: 'Falla' });
    expect(s.saldo).toBe(46000);
    s = addMovement(s, { fecha: 'b', monto: -30000, motivo: 'Uso', orden: '4000' });
    expect(s.saldo).toBe(16000);
    s = addMovement(s, { fecha: 'c', monto: -99999, motivo: 'Uso' });
    expect(s.saldo).toBe(0);
    expect(s.movimientos).toHaveLength(3);
  });
});
