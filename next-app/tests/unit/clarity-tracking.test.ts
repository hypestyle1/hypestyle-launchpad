import { describe, it, expect } from 'vitest';
import { parseClarityCookies } from '@/lib/clarity-tracking';

/**
 * De las cookies de Clarity solo viaja el primer segmento (el ID anónimo).
 * Si esto parsea de más, terminan timestamps y contadores en el meta del
 * pedido; si parsea de menos, la grabación no se puede encontrar.
 */
describe('parseClarityCookies', () => {
  it('extrae el ID de _clck y _clsk (formato id|resto|de|datos)', () => {
    const cookies = '_ga=GA1.1; _clck=abc123xyz|2|fop|0|1234; _clsk=s9d8f7|1760700000000|3|1|b.clarity.ms/collect';
    expect(parseClarityCookies(cookies)).toEqual({
      clarityUser: 'abc123xyz',
      claritySession: 's9d8f7',
    });
  });

  it('sin cookies de Clarity devuelve objeto vacío (no manda claves undefined)', () => {
    expect(parseClarityCookies('_ga=GA1.1; _fbp=fb.1.2.3')).toEqual({});
  });

  it('cookie presente pero vacía no se manda', () => {
    expect(parseClarityCookies('_clck=; _clsk=')).toEqual({});
  });

  it('valores URL-encoded se decodifican', () => {
    expect(parseClarityCookies('_clck=abc%7C2%7Cfop').clarityUser).toBe('abc');
  });
});
