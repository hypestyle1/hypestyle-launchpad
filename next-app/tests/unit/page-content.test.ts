import { describe, it, expect } from 'vitest';
import type { Language } from '@/context/LocaleContext';
import { POLITICAS } from '@/lib/pages/politicas';
import { PRIVACIDAD } from '@/lib/pages/privacidad';
import { FAQS } from '@/lib/pages/faqs';
import { CONTACTO } from '@/lib/pages/contacto';
import { NOSOTROS } from '@/lib/pages/nosotros';

// Las páginas estáticas (políticas, FAQs, contacto, nosotros, privacidad)
// tienen su texto en lib/pages/, un objeto por idioma. Este test compara la
// forma de cada idioma contra la del español: mismas claves, misma cantidad de
// secciones, de párrafos y de ítems de lista. Sin esto, una sección que se
// agrega en español y se olvida en alemán desaparece en alemán sin aviso.
// La lista de idiomas va a mano porque LocaleContext tiene JSX y vitest corre
// solo sobre lib/: si se suma un idioma, se suma acá también.
const IDIOMAS: Language[] = ['ES', 'EN', 'PT', 'DE', 'FR', 'IT'];

// Describe la estructura de un valor sin sus strings: las claves de un objeto
// y el largo de cada array, recursivo. Dos idiomas con el mismo esqueleto dan
// el mismo resultado.
function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as object).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]),
    );
  }
  if (typeof v === 'string') return v.length > 0 ? 'str' : 'EMPTY';
  return typeof v;
}

const PAGINAS = { POLITICAS, PRIVACIDAD, FAQS, CONTACTO, NOSOTROS };

describe('contenido de páginas — misma forma en todos los idiomas', () => {
  for (const [nombre, content] of Object.entries(PAGINAS)) {
    for (const lang of IDIOMAS) {
      it(`${nombre}: ${lang} tiene la misma estructura que ES`, () => {
        expect(shape(content[lang])).toEqual(shape(content.ES));
      });
    }
  }

  it('cada idioma tiene su texto propio, no una copia del español', () => {
    for (const [nombre, content] of Object.entries(PAGINAS)) {
      for (const lang of IDIOMAS.filter((l) => l !== 'ES')) {
        expect(JSON.stringify(content[lang]), `${nombre}/${lang}`).not.toBe(JSON.stringify(content.ES));
      }
    }
  });

  it('las negritas y links con formato inline quedan balanceados', () => {
    const json = JSON.stringify(PAGINAS);
    expect((json.match(/\*\*/g) ?? []).length % 2).toBe(0);
    expect((json.match(/\]\(/g) ?? []).length).toBe((json.match(/\[[^\]]+\]\(/g) ?? []).length);
  });
});
