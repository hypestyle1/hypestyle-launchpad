import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeOffer } from '@/lib/geo';

/**
 * El sitio es español y pesos para todos —personas y buscadores— hasta que la
 * persona elige otra cosa. Googlebot rastrea desde EE.UU.: si el país cambiara
 * el idioma o la moneda solos, indexaría inglés y US$ mientras el JSON-LD dice
 * ARS (pasó hasta octubre de 2026).
 */

describe('localeOffer — qué se le OFRECE a quien nunca eligió', () => {
  it('Argentina no tiene nada que ofrecer, aunque el navegador esté en inglés', () => {
    expect(localeOffer('AR', ['en-US'])).toBeNull();
  });

  it('con país, manda el país', () => {
    expect(localeOffer('US', ['es-AR'])).toMatchObject({ language: 'EN', currency: 'USD' });
    expect(localeOffer('BR', [])).toMatchObject({ language: 'PT', currency: 'BRL' });
    expect(localeOffer('ES', [])).toMatchObject({ language: 'ES', currency: 'EUR' });
  });

  it('sin país, el idioma del navegador ofrece solo el idioma (la moneda queda en pesos)', () => {
    const offer = localeOffer(null, ['en-US', 'en']);
    expect(offer).toEqual({ language: 'EN', label: 'English' });
    expect(offer?.currency).toBeUndefined();
    expect(localeOffer(null, ['pt-BR'])).toEqual({ language: 'PT', label: 'Português' });
  });

  it('sin país y con navegador en español o en un idioma sin traducir, no hay oferta', () => {
    expect(localeOffer(null, ['es-AR'])).toBeNull();
    expect(localeOffer(null, ['ja-JP', 'es'])).toBeNull();
    expect(localeOffer(null, [])).toBeNull();
  });

  it('salta idiomas sin traducir hasta el primero que el sitio tiene', () => {
    expect(localeOffer(null, ['ja-JP', 'fr-FR'])).toEqual({ language: 'FR', label: 'Français' });
  });
});

describe('LocaleContext — sin elección no aplica país ni navegador', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'context', 'LocaleContext.tsx'), 'utf8');

  it('no importa la geo para decidir idioma o moneda', () => {
    expect(src).not.toMatch(/localeForCountry|localeOffer/);
    expect(src).not.toMatch(/navigator\.language/);
  });

  it('arranca en ES/ARS', () => {
    expect(src).toMatch(/useState<Language>\('ES'\)/);
    expect(src).toMatch(/useState<Currency>\('ARS'\)/);
  });
});
