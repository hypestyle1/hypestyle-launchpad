import { describe, it, expect } from 'vitest';
import { normalizeCpAr } from '@/lib/postal-code';

describe('normalizeCpAr', () => {
  it('extrae los 4 dígitos del CPA completo', () => {
    // El caso que rompió el checkout: Andreani devuelve 400 con el CPA entero.
    expect(normalizeCpAr('C1414DNV')).toBe('1414');
    expect(normalizeCpAr('B1636FDA')).toBe('1636');
    expect(normalizeCpAr('X5000JHC')).toBe('5000');
  });

  it('deja pasar el CP numérico de siempre', () => {
    expect(normalizeCpAr('1414')).toBe('1414');
    expect(normalizeCpAr('5000')).toBe('5000');
  });

  it('tolera minúsculas, espacios y guiones', () => {
    expect(normalizeCpAr('c1414dnv')).toBe('1414');
    expect(normalizeCpAr(' 1414 ')).toBe('1414');
    expect(normalizeCpAr('1414 CABA')).toBe('1414');
    expect(normalizeCpAr('C-1414-DNV')).toBe('1414');
  });

  it('no rompe con vacío ni nulo', () => {
    expect(normalizeCpAr('')).toBe('');
    expect(normalizeCpAr(null)).toBe('');
    expect(normalizeCpAr(undefined)).toBe('');
  });

  it('devuelve lo que hay si no encuentra 4 dígitos seguidos', () => {
    expect(normalizeCpAr('abc')).toBe('ABC');
    expect(normalizeCpAr('123')).toBe('123');
  });
});
