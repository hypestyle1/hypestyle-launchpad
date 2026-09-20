import { describe, it, expect } from 'vitest';
import { CURRENCIES, formatMoney, isCurrency, chargeCurrency, type RatesLike } from '@/lib/currency';
import { missingTranslations, translate } from '@/lib/i18n';
import { localeForCountry } from '@/lib/geo';

// Cotizaciones redondas para que las cuentas se lean de un vistazo.
const RATES: RatesLike = { USD: 1500, EUR: 1750, BRL: 300, GBP: 2000, MXN: 90, CLP: 1.6, UYU: 40 };

describe('formatMoney', () => {
  it('pesos argentinos: igual que siempre, entero con punto de miles', () => {
    expect(formatMoney(100000, 'ARS', RATES)).toBe('$ 100.000');
    expect(formatMoney(999, 'ARS', RATES)).toBe('$ 999');
    expect(formatMoney(1234567, 'ARS', RATES)).toBe('$ 1.234.567');
  });

  it('dólar y euro conservan el formato que ya tenían', () => {
    expect(formatMoney(100000, 'USD', RATES)).toBe('US$ 66.67');
    expect(formatMoney(100000, 'EUR', RATES)).toBe('€ 57.14');
  });

  it('el peso chileno no tiene centavos y se muestra sin decimales', () => {
    expect(formatMoney(100000, 'CLP', RATES)).toBe('CLP$ 62.500');
    expect(formatMoney(100001, 'CLP', RATES)).toBe('CLP$ 62.501');
  });

  it('cada moneda nueva con su símbolo y sus separadores', () => {
    expect(formatMoney(600000, 'BRL', RATES)).toBe('R$ 2.000,00');
    expect(formatMoney(100000, 'GBP', RATES)).toBe('£ 50.00');
    expect(formatMoney(100000, 'MXN', RATES)).toBe('MX$ 1,111.11');
    expect(formatMoney(100000, 'UYU', RATES)).toBe('$U 2.500,00');
  });

  it('miles también en dólares (un pedido grande pasa los US$ 1.000)', () => {
    expect(formatMoney(3000000, 'USD', RATES)).toBe('US$ 2,000.00');
  });

  it('un monto negativo lleva el signo pegado al número', () => {
    expect(formatMoney(-150000, 'USD', RATES)).toBe('US$ -100.00');
  });

  it('las monedas que usan "$" no se confunden entre sí', () => {
    const simbolos = CURRENCIES.map((c) => c.symbol);
    expect(new Set(simbolos).size).toBe(simbolos.length);
  });
});

describe('isCurrency — lo que viene de localStorage', () => {
  it('acepta las ocho y rechaza el resto', () => {
    for (const c of CURRENCIES) expect(isCurrency(c.code)).toBe(true);
    for (const v of ['COP', 'usd', '', null, undefined, 5, 'toString']) expect(isCurrency(v)).toBe(false);
  });
});

describe('chargeCurrency — mostrar no es cobrar', () => {
  it('envío a Argentina se cobra en pesos; afuera, en dólares', () => {
    expect(chargeCurrency('AR')).toBe('ARS');
    for (const pais of ['BR', 'GB', 'MX', 'CL', 'UY', 'ES', 'US', 'OTHER']) expect(chargeCurrency(pais)).toBe('USD');
  });

  it('PayPal cobra en dólares aunque el envío sea a Argentina', () => {
    expect(chargeCurrency('AR', 'paypal')).toBe('USD');
    expect(chargeCurrency('AR', 'transferencia')).toBe('ARS');
    expect(chargeCurrency('AR', '')).toBe('ARS');
  });
});

describe('selector — nombres de moneda traducidos', () => {
  it('cada moneda tiene su nombre en los cinco idiomas', () => {
    for (const c of CURRENCIES) {
      for (const lang of ['EN', 'PT', 'DE', 'FR', 'IT'] as const) {
        expect(missingTranslations(lang), `${c.label} en ${lang}`).not.toContain(c.label);
        expect(translate(c.label, lang).length, `${c.label} en ${lang}`).toBeGreaterThan(0);
      }
    }
    expect(translate('Libras esterlinas', 'EN')).toBe('British pounds');
    expect(translate('Reales brasileños', 'PT')).toBe('Reais');
    // Una clave que no está en el diccionario vuelve tal cual: así se detecta.
    expect(translate('Pesos chilenos', 'DE')).not.toBe('Pesos chilenos');
  });
});

describe('geo — moneda sugerida por país', () => {
  it('los cinco países con moneda nueva', () => {
    expect(localeForCountry('BR')).toMatchObject({ language: 'PT', currency: 'BRL' });
    expect(localeForCountry('GB')).toMatchObject({ language: 'EN', currency: 'GBP' });
    expect(localeForCountry('MX')).toMatchObject({ language: 'ES', currency: 'MXN' });
    expect(localeForCountry('CL')).toMatchObject({ language: 'ES', currency: 'CLP' });
    expect(localeForCountry('UY')).toMatchObject({ language: 'ES', currency: 'UYU' });
  });

  it('acepta el código en minúsculas', () => {
    expect(localeForCountry('gb')).toMatchObject({ currency: 'GBP' });
  });

  it('Argentina no sugiere nada', () => {
    expect(localeForCountry('AR')).toBeNull();
    expect(localeForCountry(null)).toBeNull();
  });

  it('lo que no cambió: dólar para EE.UU., Canadá y el resto de Hispanoamérica', () => {
    for (const c of ['US', 'CA', 'AU', 'IE']) expect(localeForCountry(c)).toMatchObject({ language: 'EN', currency: 'USD' });
    for (const c of ['CO', 'PE', 'PY', 'EC']) expect(localeForCountry(c)).toMatchObject({ language: 'ES', currency: 'USD' });
    expect(localeForCountry('JP')).toMatchObject({ language: 'EN', currency: 'USD' });
  });

  it('Portugal sigue en euros aunque comparta idioma con Brasil', () => {
    expect(localeForCountry('PT')).toMatchObject({ language: 'PT', currency: 'EUR' });
  });

  it('España recibe español con euro, no inglés', () => {
    expect(localeForCountry('ES')).toMatchObject({ language: 'ES', currency: 'EUR' });
  });

  it('toda moneda sugerida existe en el selector', () => {
    const codes = CURRENCIES.map((c) => c.code);
    for (const pais of ['BR', 'GB', 'MX', 'CL', 'UY', 'US', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'CO', 'JP']) {
      expect(codes).toContain(localeForCountry(pais)!.currency);
    }
  });
});
