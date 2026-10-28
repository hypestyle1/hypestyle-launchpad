import { describe, it, expect } from 'vitest';
import { formatDivisa, notaDivisa, parseDivisa } from '@/lib/mayorista-divisa';
import { FX_FALLBACK } from '@/lib/fx';

// Cotizaciones redondas para que los casos se lean solos.
const RATES = { ...FX_FALLBACK, USD: 1000, CLP: 1.6 };

describe('parseDivisa', () => {
  it('acepta las tres del portal, en cualquier caja', () => {
    expect(parseDivisa('usd')).toBe('USD');
    expect(parseDivisa(' ARS ')).toBe('ARS');
    expect(parseDivisa('clp')).toBe('CLP');
  });
  it('rechaza lo que no es divisa del portal', () => {
    expect(parseDivisa('EUR')).toBeNull();
    expect(parseDivisa('')).toBeNull();
    expect(parseDivisa(null)).toBeNull();
    expect(parseDivisa(7)).toBeNull();
  });
});

describe('formatDivisa', () => {
  it('en pesos escribe lo mismo que siempre: sin espacio ni centavos', () => {
    expect(formatDivisa(110000, 'ARS', RATES)).toBe('$110.000');
    expect(formatDivisa(45500.4, 'ARS', RATES)).toBe('$45.500');
  });
  it('convierte a dólares con dos decimales', () => {
    expect(formatDivisa(110000, 'USD', RATES)).toBe('US$ 110.00');
    expect(formatDivisa(1234567, 'USD', RATES)).toBe('US$ 1,234.57');
  });
  it('el peso chileno no lleva centavos', () => {
    expect(formatDivisa(16000, 'CLP', RATES)).toBe('CLP$ 10.000');
  });
  it('con la cotización rota muestra pesos antes que un precio inventado', () => {
    expect(formatDivisa(110000, 'USD', { ...RATES, USD: 0 })).toBe('$110.000');
    expect(formatDivisa(110000, 'USD', { ...RATES, USD: NaN })).toBe('$110.000');
  });
});

describe('notaDivisa', () => {
  it('en pesos no aclara nada', () => {
    expect(notaDivisa('ARS', RATES)).toBeNull();
  });
  it('dice la cotización y que se factura en pesos', () => {
    const nota = notaDivisa('USD', RATES)!;
    expect(nota).toContain('US$ 1 = $1.000');
    expect(nota).toContain('se factura en pesos argentinos');
  });
  it('da vuelta la equivalencia cuando la moneda vale menos que el peso', () => {
    // 1 CLP = $1,6 se leería "CLP$ 1 = $2": se escribe al revés.
    expect(notaDivisa('CLP', RATES)).toContain('$1.000 = CLP$ 625');
  });
  it('sin cotización usable no inventa una nota', () => {
    expect(notaDivisa('USD', { ...RATES, USD: 0 })).toBeNull();
  });
});
