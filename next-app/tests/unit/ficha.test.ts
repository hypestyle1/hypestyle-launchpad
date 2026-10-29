import { describe, expect, it } from 'vitest';
import { abreCuadrada, composicion, esMockup, ordenarFotos, resumen, ventanaEntrega } from '@/lib/ficha';

const wp = (archivo: string) => `https://wp.test/wp-content/uploads/2026/05/${archivo}`;

describe('ordenarFotos', () => {
  // Estos dos casos necesitan un slug que en lib/ficha-fotos.json tenga mockup Y tabla.
  // Antes usaban camo-full-set-combo, pero sus dos tablas se sacaron de la galería de Woo
  // y al regenerar el archivo quedó sin tablas. Si este test vuelve a fallar, buscar en
  // ficha-fotos.json otro slug que tenga las dos cosas en vez de cambiar la expectativa.
  const MOCKUP = 'eye-sleveless-wheat-destacada-v2.png';
  const TABLA = '465605f2-d8f7-4932-b1ea-162d6c56a000-e0f8ebd20164cb459117367000786541-1024-1024.jpeg';

  it('pone las fotos primero, después los mockups, y deja la tabla de talles afuera', () => {
    const galeria = [MOCKUP, 'eye-01.jpg', 'eye-02.jpg', TABLA].map(wp);
    expect(ordenarFotos('eye-sleveless-wheat', galeria).map(u => u.split('/').pop())).toEqual([
      'eye-01.jpg', 'eye-02.jpg', MOCKUP,
    ]);
  });

  it('deja la galería como está si solo tuviera tablas', () => {
    // La misma tabla subida dos veces: hacen falta 2 imágenes porque ordenarFotos
    // devuelve la galería tal cual cuando tiene menos de 2, y así no se probaría nada.
    const galeria = [
      `https://wp.test/wp-content/uploads/2026/05/${TABLA}`,
      `https://wp.test/wp-content/uploads/2026/06/${TABLA}`,
    ];
    expect(ordenarFotos('eye-sleveless-wheat', galeria)).toEqual(galeria);
  });

  it('abre con el frente cuando el producto solo tiene mockups', () => {
    const galeria = ['remera-regular-navy-frente.png', 'remera-regular-navy-espalda.png'].map(wp);
    expect(ordenarFotos('regular-tee-navy', galeria)).toEqual(galeria);
  });

  it('trata como foto una imagen que el archivo no conoce', () => {
    const galeria = ['remera-regular-navy-frente.png', 'foto-nueva.jpg'].map(wp);
    expect(ordenarFotos('regular-tee-navy', galeria)[0]).toBe(wp('foto-nueva.jpg'));
  });

  it('manda la destacada al final en un producto sin clasificar', () => {
    expect(ordenarFotos('producto-que-no-existe', ['a.png', 'b.jpg', 'c.jpg'])).toEqual(['b.jpg', 'c.jpg', 'a.png']);
  });

  it('reconoce los mockups para mostrarlos enteros', () => {
    expect(esMockup('regular-tee-navy', wp('remera-regular-navy-frente.png'))).toBe(true);
    expect(esMockup('regular-tee-navy', wp('foto-nueva.jpg'))).toBe(false);
  });
});

describe('composicion', () => {
  it('saca el porcentaje pegado a la fibra', () => {
    expect(composicion('Confeccionado en rústico premium 100% algodón con estampa camo.')).toBe('100% algodón');
    expect(composicion('Material: Jersey 100% algodon peinado 24/1')).toBe('100% algodón peinado');
  });

  it('junta una mezcla que cierra en 100', () => {
    expect(composicion('54% poliéster, 20% nylon, 20% acrílico, 6% lana')).toBe('54% poliéster, 20% nylon, 20% acrílico, 6% lana');
  });

  it('no inventa nada cuando no hay porcentaje o la mezcla no cierra', () => {
    expect(composicion('RUNNING HORSES – WAFFLE LONGSLEEVE\nLongsleeve en tejido waffle.')).toBeNull();
    expect(composicion('60% algodón y detalles en cuero')).toBeNull();
    expect(composicion('33% OFF en toda la tienda')).toBeNull();
  });
});

describe('resumen', () => {
  it('saltea el título en mayúsculas y los rótulos', () => {
    const texto = 'CAMO FULL SET\nDETALLES:\nCombo completo del drop camo: incluye Zip Hoodie Camo + Sweatpant Camo + Camo Cap.\n• Cierres YKK';
    expect(resumen(texto)).toMatch(/^Combo completo/);
  });

  it('devuelve vacío si no hay un párrafo que sirva', () => {
    expect(resumen('CREWNECK HYPEDUP! BLACK.')).toBe('');
  });
});

describe('ventanaEntrega', () => {
  it('cuenta días hábiles dentro del mismo mes', () => {
    // Martes 29/09/2026: +5 hábiles = martes 06/10, +10 = martes 13/10.
    expect(ventanaEntrega(new Date(2026, 8, 29))).toBe('6 al 13 de octubre');
  });

  it('nombra los dos meses cuando la ventana cruza de mes', () => {
    expect(ventanaEntrega(new Date(2026, 9, 22))).toBe('29 de octubre al 5 de noviembre');
  });
});

describe('abreCuadrada', () => {
  it('sigue el formato de la foto que abre la ficha', () => {
    expect(abreCuadrada('camo-full-set-combo')).toBe(true);
    expect(abreCuadrada('sweatpant-black-hstars')).toBe(false);
  });

  it('trata como cuadrado un producto sin clasificar', () => {
    expect(abreCuadrada('producto-que-no-existe')).toBe(true);
  });
});
