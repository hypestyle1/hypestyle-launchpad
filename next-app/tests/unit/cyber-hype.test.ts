import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const RAIZ = join(__dirname, '..', '..');
import {
  CYBER_START,
  CYBER_END,
  CYBER_FECHAS,
  cyberEstado,
  cyberProximoHito,
  cyberCapturaAbierta,
} from '@/lib/cyber-hype';
import { PACK_REGULAR_X4_DESDE, PACK_REGULAR_X4_HASTA } from '@/lib/promo-pack-regular';
import { isExcludedPage } from '@/lib/newsletter-popup';

/**
 * Fechas y estado de la landing de CYBER HYPE.
 *
 * El test que más importa es el de coherencia con la ventana del 4 PACK: si la
 * landing y el carrito se separan, la página dice "abrió" mientras el carrito
 * todavía cobra el precio viejo.
 */
describe('CYBER HYPE — fechas', () => {
  it('arranca y termina en el mismo instante que la ventana del 4 PACK', () => {
    expect(Date.parse(CYBER_START)).toBe(PACK_REGULAR_X4_DESDE);
    expect(Date.parse(CYBER_END)).toBe(PACK_REGULAR_X4_HASTA);
  });

  it('abre el 2/11 a las 00:00 ART y cierra el 4/11 a las 23:59', () => {
    expect(new Date(CYBER_START).toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(new Date(CYBER_END).toISOString()).toBe('2026-11-05T03:00:00.000Z');
  });

  it('el texto de fechas es el único dato duro que se comunica', () => {
    expect(CYBER_FECHAS).toBe('2, 3 y 4 de noviembre');
  });
});

describe('CYBER HYPE — estado por fecha', () => {
  const t = (iso: string) => new Date(iso);

  it('antes de la apertura es previa', () => {
    expect(cyberEstado(t('2026-10-28T12:00:00-03:00'))).toBe('previa');
    expect(cyberEstado(t('2026-11-01T23:59:59-03:00'))).toBe('previa');
  });

  it('el primer segundo de la apertura ya es evento', () => {
    expect(cyberEstado(t('2026-11-02T00:00:00-03:00'))).toBe('evento');
    expect(cyberEstado(t('2026-11-04T23:59:59-03:00'))).toBe('evento');
  });

  it('a las 00:00 del 5/11 está cerrado', () => {
    expect(cyberEstado(t('2026-11-05T00:00:00-03:00'))).toBe('cerrado');
  });

  it('no hay acceso anticipado: a las 23:00 del 1/11 todavía es previa', () => {
    // El estado "preview" del PR original (1/11 23:00) se eliminó a propósito:
    // la landing no habilita nada antes de la hora pública.
    expect(cyberEstado(t('2026-11-01T23:00:00-03:00'))).toBe('previa');
  });
});

describe('CYBER HYPE — captación', () => {
  it('solo está abierta en la previa', () => {
    expect(cyberCapturaAbierta(new Date('2026-10-29T10:00:00-03:00'))).toBe(true);
    expect(cyberCapturaAbierta(new Date('2026-11-02T01:00:00-03:00'))).toBe(false);
    expect(cyberCapturaAbierta(new Date('2026-11-06T01:00:00-03:00'))).toBe(false);
  });

  it('el reloj cuenta a la apertura, después al cierre, y después a nada', () => {
    expect(cyberProximoHito(new Date('2026-10-29T10:00:00-03:00'))).toEqual({ iso: CYBER_START, label: 'Abre en' });
    expect(cyberProximoHito(new Date('2026-11-03T10:00:00-03:00'))).toEqual({ iso: CYBER_END, label: 'Cierra en' });
    expect(cyberProximoHito(new Date('2026-11-06T10:00:00-03:00'))).toBeNull();
  });
});

describe('popup de newsletter', () => {
  it('no aparece en la landing del evento (ofrece HYPE10, que se suma a los packs)', () => {
    expect(isExcludedPage('/hype72')).toBe(true);
    expect(isExcludedPage('/hype72/')).toBe(true);
  });

  it('sigue apareciendo donde aparecía', () => {
    expect(isExcludedPage('/producto/remera-x')).toBe(false);
    expect(isExcludedPage('/')).toBe(false);
  });
});

/**
 * Dos garantías que no se pueden ver corriendo la página: que la clave de la
 * lista no salga nunca al navegador, y que la landing no muestre nada
 * comercial antes de la fecha autorizada.
 */
// Estos tres recorren todo el árbol de `app`, `lib` y `components` leyendo cada
// archivo de forma síncrona. En una máquina descargada tardan menos de un
// segundo, pero con el server de desarrollo corriendo al lado pasaron de los
// 5 s por defecto de vitest y aparecían en rojo por timeout — rojo que no
// significaba nada y enseñaba a ignorar los checks. 20 s les sobra y sigue
// siendo un tope: si alguna vez tardan eso, algo se rompió de verdad.
describe('la lista de Brevo es solo del servidor', { timeout: 20_000 }, () => {
  const fuentes = (dir: string): string[] => {
    const out: string[] = [];
    for (const d of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      if (d.name === 'node_modules' || d.name.startsWith('.')) continue;
      const p = join(dir, d.name);
      if (d.isDirectory()) out.push(...fuentes(p));
      else if (/\.(ts|tsx)$/.test(d.name)) out.push(p);
    }
    return out;
  };

  it('no existe ninguna variable NEXT_PUBLIC_BREVO', () => {
    const culpables = [...fuentes('app'), ...fuentes('lib'), ...fuentes('components')]
      .filter((f) => readFileSync(join(RAIZ, f), 'utf8').includes('NEXT_PUBLIC_BREVO'));
    expect(culpables).toEqual([]);
  });

  it('ningún componente del cliente lee la lista ni la clave de Brevo', () => {
    const culpables = fuentes('components')
      .concat(fuentes('lib').filter((f) => f.includes('cliente')))
      .filter((f) => /BREVO_|BREVO_API_KEY/.test(readFileSync(join(RAIZ, f), 'utf8')));
    expect(culpables).toEqual([]);
  });

  it('solo la ruta del servidor la lee', () => {
    const lectores = [...fuentes('app'), ...fuentes('lib')]
      .filter((f) => readFileSync(join(RAIZ, f), 'utf8').includes('BREVO_CYBER_LIST_ID'));
    expect(lectores).toEqual([join('app', 'api', 'newsletter-subscribe', 'route.ts')]);
  });
});

describe('la landing no adelanta nada comercial', () => {
  // Se miran los textos que ve el visitante, no los comentarios del código:
  // acá se habla de precios y descuentos justamente para explicar por qué no
  // van en la página.
  const sinComentarios = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

  const textos = ['app/hype72/page.tsx', 'components/cyber/CyberAvisame.tsx', 'lib/cyber-hype.ts']
    .map((f) => sinComentarios(readFileSync(join(RAIZ, f.replace(/\//g, sep)), 'utf8')))
    .join('\n');

  it('no hay precios ni porcentajes en la página de previa', () => {
    // 89 de 145 productos tienen precio de oferta permanente: un porcentaje
    // contra el "precio de lista" sería un precio de referencia inventado.
    expect(textos).not.toMatch(/\$\s?\d/);
    expect(textos).not.toMatch(/\d\s?%/);
    // "off" suelto no sirve de señal: lo usan autoCapitalize y autoComplete.
    expect(textos).not.toMatch(/%\s*off/i);
    expect(textos).not.toMatch(/descuento|rebaja|liquidaci[oó]n|cuotas sin inter[eé]s/i);
  });

  it('no promete acceso anticipado', () => {
    // La landing tiene que DECIR que abre igual para todos, no solo evitar
    // prometer lo contrario. El rediseño del 28/10 se llevó las tarjetas de
    // "Qué es" donde estaba la frase "No hay acceso anticipado"; la condición
    // ahora se cumple con "Igual para todos", que dice lo mismo en una línea.
    expect(textos).toMatch(/Igual para todos|No hay acceso anticipado/i);
    expect(textos).not.toMatch(/acceso anticipado para/i);
    expect(textos).not.toMatch(/antes que (nadie|el resto|todos)/i);
    // Lo que sí no puede aparecer nunca: que dejar el mail compre antes.
    expect(textos).not.toMatch(/compr\w+ (antes|primero)/i);
  });
});
