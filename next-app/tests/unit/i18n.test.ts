import { describe, it, expect } from 'vitest';
import { missingTranslations, translate } from '@/lib/i18n';
import type { Language } from '@/context/LocaleContext';
import { localeForCountry } from '@/lib/geo';

// Un idioma en el selector sin su columna completa se ve en español sin
// avisar. Este test es lo que impide que vuelva a pasar lo del Footer con
// DE/FR/IT. La lista va a mano porque LocaleContext es un componente con JSX
// y vitest corre solo sobre lib/: si se suma un idioma, se suma acá también.
const IDIOMAS: Exclude<Language, 'ES'>[] = ['EN', 'PT', 'DE', 'FR', 'IT'];

describe('i18n — columnas completas', () => {
  for (const lang of IDIOMAS) {
    it(`no le falta ninguna clave a ${lang}`, () => {
      expect(missingTranslations(lang)).toEqual([]);
    });
  }

  it('traduce y cae a español si falta', () => {
    expect(translate('Carrito', 'DE')).toBe('Warenkorb');
    expect(translate('Carrito', 'FR')).toBe('Panier');
    expect(translate('Carrito', 'IT')).toBe('Carrello');
    expect(translate('Carrito', 'ES')).toBe('Carrito');
    expect(translate('texto que no existe', 'IT')).toBe('texto que no existe');
  });
});

describe('geo — idioma sugerido por país', () => {
  it('Alemania, Austria y Suiza → alemán con euro', () => {
    for (const c of ['DE', 'AT', 'CH']) expect(localeForCountry(c)).toMatchObject({ language: 'DE', currency: 'EUR' });
  });
  it('Francia y Bélgica → francés con euro', () => {
    for (const c of ['FR', 'BE']) expect(localeForCountry(c)).toMatchObject({ language: 'FR', currency: 'EUR' });
  });
  it('Italia → italiano con euro', () => {
    expect(localeForCountry('IT')).toMatchObject({ language: 'IT', currency: 'EUR' });
  });
  it('el resto de Europa sigue en inglés con euro', () => {
    expect(localeForCountry('NL')).toMatchObject({ language: 'EN', currency: 'EUR' });
    expect(localeForCountry('pt')).toMatchObject({ language: 'PT', currency: 'EUR' });
  });
});
