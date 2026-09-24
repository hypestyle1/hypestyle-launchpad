import { describe, it, expect } from 'vitest';
import { wholesaleMarginRisk, costProfileLooksProvisional } from '@/lib/wholesale-margin-risk';

// Umbrales aprobados el 24/09/2026: CRITICAL < 3,33x · RISK < 3,5x · COST_UNKNOWN.
// Solo alerta: nunca cambia precios.

describe('wholesaleMarginRisk', () => {
  it('Half-Zip Polo: $73.000 sobre $14.784 = 4,94x → OK, 60% de margen mayorista', () => {
    const r = wholesaleMarginRisk({ regularPrice: 73000, cost: 14784.17, costReliable: true, wholesale: true });
    expect(r.level).toBe('OK');
    expect(r.wholesalePrice).toBe(36500);
    expect(r.multiple).toBeCloseTo(4.94, 2);
    expect(r.wholesaleMargin).toBeCloseTo(0.595, 2);
  });

  it('HS CO hoodie: $76.000 sobre $21.846 = 3,48x → RISK', () => {
    expect(wholesaleMarginRisk({ regularPrice: 76000, cost: 21846.07, costReliable: true, wholesale: true }).level).toBe('RISK');
  });

  it('Sweater Distressed: $89.000 sobre $31.600 = 2,82x → CRITICAL (29% en mayorista)', () => {
    const r = wholesaleMarginRisk({ regularPrice: 89000, cost: 31600, costReliable: true, wholesale: true });
    expect(r.level).toBe('CRITICAL');
    expect(r.wholesaleMargin).toBeCloseTo(0.29, 2);
  });

  it('en el piso exacto (3,33x) no es CRITICAL pero sí RISK; a 3,5x ya es OK', () => {
    expect(wholesaleMarginRisk({ regularPrice: 33300, cost: 10000, costReliable: true, wholesale: true }).level).toBe('RISK');
    expect(wholesaleMarginRisk({ regularPrice: 35000, cost: 10000, costReliable: true, wholesale: true }).level).toBe('OK');
    expect(wholesaleMarginRisk({ regularPrice: 33200, cost: 10000, costReliable: true, wholesale: true }).level).toBe('CRITICAL');
  });

  it('sin costo confiable → COST_UNKNOWN, aunque el múltiplo diera bien', () => {
    expect(wholesaleMarginRisk({ regularPrice: 96000, cost: null, costReliable: false, wholesale: true }).level).toBe('COST_UNKNOWN');
    expect(wholesaleMarginRisk({ regularPrice: 96000, cost: 6000, costReliable: false, wholesale: true }).level).toBe('COST_UNKNOWN');
    expect(wholesaleMarginRisk({ regularPrice: 96000, cost: 0, costReliable: true, wholesale: true }).level).toBe('COST_UNKNOWN');
  });

  it('sin PVP → COST_UNKNOWN (no hay contra qué medir)', () => {
    expect(wholesaleMarginRisk({ regularPrice: null, cost: 10000, costReliable: true, wholesale: true }).level).toBe('COST_UNKNOWN');
  });

  it('fuera del catálogo mayorista → NOT_WHOLESALE', () => {
    const r = wholesaleMarginRisk({ regularPrice: 102000, cost: 15663.87, costReliable: true, wholesale: false });
    expect(r.level).toBe('NOT_WHOLESALE');
    expect(r.multiple).toBeNull();
  });
});

describe('costProfileLooksProvisional', () => {
  it('detecta "(a confirmar)" en el nombre del perfil', () => {
    expect(costProfileLooksProvisional('GORRA BORDADA (a confirmar)')).toBe(true);
    expect(costProfileLooksProvisional('BORDADO + CORTE Y CONFECCION (a confirmar)')).toBe(true);
    expect(costProfileLooksProvisional('BUZO FRIZA')).toBe(false);
    expect(costProfileLooksProvisional(null)).toBe(false);
  });
});
