import { describe, it, expect } from 'vitest';
import { buildPoolsPayload, decodeWpTitle, COLOR_LABEL } from '@/lib/shared-stock';

// buildPoolsPayload es el filtro entre el formulario del panel y el mu-plugin:
// deja pasar sólo enteros >= 0, ignora los casilleros vacíos (que significan
// "no toques ese talle") y frena lo demás antes de escribir stock en Woo.

const COLORES = ['melange', 'black', 'white', 'navy'];
const TALLES = ['S', 'M', 'L', 'XL'];
const build = (crudo: Record<string, Record<string, string>>) => buildPoolsPayload(crudo, COLORES, TALLES);

describe('buildPoolsPayload', () => {
  it('convierte a número lo que se cargó', () => {
    expect(build({ melange: { S: '1', M: '2', L: '7', XL: '12' } })).toEqual({
      pools: { melange: { S: 1, M: 2, L: 7, XL: 12 } },
    });
  });

  it('ignora los casilleros vacíos y los de sólo espacios', () => {
    expect(build({ melange: { S: '3', M: '', L: '   ', XL: '9' } })).toEqual({
      pools: { melange: { S: 3, XL: 9 } },
    });
  });

  it('deja pasar el cero, que es una carga válida', () => {
    expect(build({ white: { S: '0' } })).toEqual({ pools: { white: { S: 0 } } });
  });

  it('descarta el color entero cuando no se cargó ningún talle', () => {
    const r = build({ melange: { S: '4' }, navy: { S: '', M: '' } });
    expect(r).toEqual({ pools: { melange: { S: 4 } } });
  });

  it('junta varios colores en un solo payload', () => {
    expect(build({ black: { L: '15' }, navy: { L: '6' } })).toEqual({
      pools: { black: { L: 15 }, navy: { L: 6 } },
    });
  });

  it('rechaza un formulario sin ningún cambio', () => {
    expect(build({ melange: { S: '', M: '' } })).toEqual({ error: 'No hay ningún cambio para guardar' });
    expect(build({})).toEqual({ error: 'No hay ningún cambio para guardar' });
  });

  it('rechaza colores y talles que no existen', () => {
    expect(build({ verde: { S: '3' } })).toEqual({ error: 'Color desconocido: verde' });
    expect(build({ melange: { XXL: '3' } })).toEqual({ error: 'Talle desconocido: XXL' });
  });

  it.each([
    ['-1', 'negativos'],
    ['2.5', 'decimales'],
    ['tres', 'texto'],
    ['1e3', 'notación científica'],
    ['0x10', 'hexadecimal'],
    ['+4', 'con signo'],
  ])('rechaza %s (%s)', (valor) => {
    const r = build({ melange: { S: valor } });
    expect(r).toEqual({ error: `${COLOR_LABEL.melange} S: poné un número entero de 0 en adelante` });
  });

  it('no arma un payload parcial cuando falla un talle posterior', () => {
    // Importa: si devolviera lo válido y avisara del error, se cargaría media
    // pila y el operador creería que no se guardó nada.
    const r = build({ melange: { S: '5' }, navy: { S: '-4' } });
    expect(r).toEqual({ error: `${COLOR_LABEL.navy} S: poné un número entero de 0 en adelante` });
    expect(r).not.toHaveProperty('pools');
  });
});

describe('decodeWpTitle', () => {
  it('decodifica el guion largo que manda WordPress', () => {
    // Tal cual lo devuelve hypestyle/v1/shared-stock en producción.
    expect(decodeWpTitle('Regular Tee &#8211; Melange')).toBe('Regular Tee – Melange');
    expect(decodeWpTitle('Regular Tees &#8211; 3 PACK (Black, Melange, White)'))
      .toBe('Regular Tees – 3 PACK (Black, Melange, White)');
  });

  it('cubre entidades hexadecimales y nombradas', () => {
    expect(decodeWpTitle('Tee &#x2013; Navy')).toBe('Tee – Navy');
    expect(decodeWpTitle('Black &amp; White')).toBe('Black & White');
    expect(decodeWpTitle('Talle&nbsp;S')).toBe('Talle S');
    expect(decodeWpTitle('&quot;Hype&quot;')).toBe('"Hype"');
  });

  it('deja intacto un título que ya es texto plano', () => {
    expect(decodeWpTitle('Regular Tee - Melange')).toBe('Regular Tee - Melange');
    expect(decodeWpTitle('')).toBe('');
  });

  it('resuelve &amp; al final, sin encadenar decodificaciones', () => {
    // Un &amp;lt; tiene que quedar en &lt; literal, no convertirse en <.
    expect(decodeWpTitle('&amp;lt;')).toBe('&lt;');
  });
});
