import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  PACK_REGULAR_X4_DESDE,
  PACK_REGULAR_X4_HASTA,
  computePackRegularDiscount,
  packRegularCostoSiguiente,
  packRegularEtiqueta,
  packRegularFaltan,
  packRegularMasBarata,
  packRegularSiguienteGratis,
  packRegularUnidades,
  packRegularX4Vigente,
  precioPackRegular,
} from '@/lib/promo-pack-regular';

/**
 * Pack libre: 3 Regular Tees individuales de cualquier color = precio del
 * 3-PACK. El riesgo es descontar de más (contar packs o productos que no son
 * Regular) o quedar más caro que el pack fijo.
 *
 * Durante la ventana del evento HYPE 72 (2/11 00:00 → 8/11 23:59 ART) la regla
 * pasa a 4 por el precio del pack. Lo que se cubre acá: que la ventana abra y
 * cierre en el instante exacto, que un resto de 3 nunca pague más que un pack,
 * y que fuera de la ventana el comportamiento de siempre quede igual.
 */
const PACK = 59160;
const UNIDAD = 23400;
// Lo que ahorra un grupo que se cobra al precio del pack.
const AHORRO_3 = UNIDAD * 3 - PACK; // 11040
const AHORRO_4 = UNIDAD * 4 - PACK; // 34440

const black = (q: number) => ({ id: 'regular-tee-black', price: UNIDAD, quantity: q });
const white = (q: number) => ({ id: 'regular-tee-white', price: UNIDAD, quantity: q });
const navy = (q: number, price = UNIDAD) => ({ id: 'regular-tee-navy', price, quantity: q });

/** Fija el reloj del proceso en un instante ART. */
function reloj(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ventana del evento (hora de servidor)', () => {
  it('abre el 2/11/2026 00:00 ART, en el instante exacto', () => {
    reloj('2026-11-01T23:59:59-03:00');
    expect(packRegularUnidades()).toBe(3);
    expect(packRegularX4Vigente()).toBe(false);

    reloj('2026-11-02T00:00:00-03:00');
    expect(packRegularUnidades()).toBe(4);
    expect(packRegularX4Vigente()).toBe(true);
  });

  it('el último minuto (8/11/2026 23:59 ART) entra completo y el 9/11 00:00 ya no', () => {
    reloj('2026-11-08T23:59:00-03:00');
    expect(packRegularUnidades()).toBe(4);

    reloj('2026-11-08T23:59:59.999-03:00');
    expect(packRegularUnidades()).toBe(4);

    reloj('2026-11-09T00:00:00-03:00');
    expect(packRegularUnidades()).toBe(3);
    expect(packRegularX4Vigente()).toBe(false);
  });

  it('las fechas se leen con offset -03:00, no con la hora local del proceso', () => {
    // Vercel corre en UTC: 2/11 00:00 ART son las 03:00 UTC del 2/11. Sin el
    // offset escrito a mano el evento arrancaría a las 21:00 del 1/11 ART.
    expect(new Date(PACK_REGULAR_X4_DESDE).toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(new Date(PACK_REGULAR_X4_HASTA).toISOString()).toBe('2026-11-09T03:00:00.000Z');
  });

  it('bien lejos de la ventana (hoy, y en 2027) es el pack de siempre', () => {
    reloj('2026-10-25T12:00:00-03:00');
    expect(packRegularUnidades()).toBe(3);
    reloj('2027-01-15T12:00:00-03:00');
    expect(packRegularUnidades()).toBe(3);
  });

  it('el instante se puede pasar a mano (es lo que hace la ruta /api/pack-regular-status)', () => {
    expect(packRegularUnidades(PACK_REGULAR_X4_DESDE)).toBe(4);
    expect(packRegularUnidades(PACK_REGULAR_X4_DESDE - 1)).toBe(3);
    expect(packRegularUnidades(PACK_REGULAR_X4_HASTA)).toBe(3);
    expect(packRegularUnidades(PACK_REGULAR_X4_HASTA - 1)).toBe(4);
  });
});

describe('computePackRegularDiscount — fuera de la ventana (grupos de 3)', () => {
  it('2 negras + 1 blanca pagan lo mismo que el pack', () => {
    expect(computePackRegularDiscount([black(2), white(1)], PACK)).toBe(AHORRO_3);
  });

  it('menos de 3 no descuenta', () => {
    expect(computePackRegularDiscount([black(1), white(1)], PACK)).toBe(0);
  });

  it('6 son 2 packs; 4 son 1 pack + 1 suelta', () => {
    expect(computePackRegularDiscount([black(4), white(2)], PACK)).toBe(AHORRO_3 * 2);
    expect(computePackRegularDiscount([black(4)], PACK)).toBe(AHORRO_3);
  });

  it('de 3 a 8 unidades: un pack cada 3, el resto a precio de lista', () => {
    const esperado = [AHORRO_3, AHORRO_3, AHORRO_3, AHORRO_3 * 2, AHORRO_3 * 2, AHORRO_3 * 2];
    for (const [i, n] of [3, 4, 5, 6, 7, 8].entries()) {
      expect(computePackRegularDiscount([black(n)], PACK)).toBe(esperado[i]);
    }
  });

  it('solo cuentan las Regular individuales, no los packs ni otros productos', () => {
    const otros = [
      { id: 'regular-tees-3-pack-black', price: PACK, quantity: 1 },
      { id: 'boxy-tee', price: UNIDAD, quantity: 2 },
      black(1),
    ];
    expect(computePackRegularDiscount(otros, PACK)).toBe(0);
  });

  it('sin precio de pack en el catálogo no hay descuento', () => {
    expect(computePackRegularDiscount([black(3)], null)).toBe(0);
    expect(computePackRegularDiscount([black(4)], null, 4)).toBe(0);
  });

  it('nunca negativo si las individuales están más baratas que el pack', () => {
    expect(computePackRegularDiscount([navy(3, 15000)], PACK)).toBe(0);
    expect(computePackRegularDiscount([navy(4, 14000)], PACK, 4)).toBe(0);
  });
});

describe('computePackRegularDiscount — dentro de la ventana (pagás 3, llevás 4)', () => {
  it('4 individuales se cobran al precio del pack', () => {
    expect(computePackRegularDiscount([black(4)], PACK, 4)).toBe(AHORRO_4);
  });

  it('con exactamente 3 se aplica la regla de 3: nadie paga más por llevar menos', () => {
    expect(computePackRegularDiscount([black(3)], PACK, 4)).toBe(AHORRO_3);
    // Y nunca descuenta menos que la regla de siempre, en ninguna cantidad.
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]) {
      expect(computePackRegularDiscount([black(n)], PACK, 4))
        .toBeGreaterThanOrEqual(computePackRegularDiscount([black(n)], PACK, 3));
    }
  });

  it('de 3 a 8 unidades: grupos de 4 y un resto de 3 que también paga pack', () => {
    const casos: [number, number][] = [
      [3, AHORRO_3],             // resto de 3
      [4, AHORRO_4],             // un grupo
      [5, AHORRO_4],             // un grupo + 1 suelta
      [6, AHORRO_4],             // un grupo + 2 sueltas
      [7, AHORRO_4 + AHORRO_3],  // 4 + 3
      [8, AHORRO_4 * 2],         // dos grupos
    ];
    for (const [n, esperado] of casos) {
      expect(computePackRegularDiscount([black(n)], PACK, 4), `${n} unidades`).toBe(esperado);
    }
  });

  it('mezcla de colores: da igual de qué color sean las 4', () => {
    expect(computePackRegularDiscount([black(2), white(1), navy(1)], PACK, 4)).toBe(AHORRO_4);
    expect(computePackRegularDiscount([black(1), white(1), navy(1)], PACK, 4)).toBe(AHORRO_3);
    expect(computePackRegularDiscount([black(3), white(3), navy(2)], PACK, 4)).toBe(AHORRO_4 * 2);
  });

  it('con precios distintos agrupa las más caras: la que queda afuera es la más barata', () => {
    // 4 a $23.400 + 1 a $15.000: el grupo se arma con las 4 caras y la barata
    // se cobra entera. Agrupar al revés descontaría menos.
    expect(computePackRegularDiscount([black(4), navy(1, 15000)], PACK, 4)).toBe(AHORRO_4);
    // 3 a $23.400 + 1 a $15.000: las 4 entran al grupo igual.
    expect(computePackRegularDiscount([black(3), navy(1, 15000)], PACK, 4)).toBe(UNIDAD * 3 + 15000 - PACK);
  });

  it('el 3-PACK del catálogo y los productos que no son Regular siguen afuera', () => {
    const otros = [
      { id: 'regular-tees-3-pack-black', price: PACK, quantity: 2 },
      { id: 'boxy-tee', price: UNIDAD, quantity: 3 },
      black(2),
    ];
    expect(computePackRegularDiscount(otros, PACK, 4)).toBe(0);
  });
});

describe('packRegularFaltan', () => {
  it('fuera de la ventana cuenta cuántas faltan para cerrar el próximo pack', () => {
    expect(packRegularFaltan([])).toBe(0);
    expect(packRegularFaltan([black(1)])).toBe(2);
    expect(packRegularFaltan([black(1), white(1)])).toBe(1);
    expect(packRegularFaltan([black(3)])).toBe(0);
    expect(packRegularFaltan([black(4)])).toBe(2);
  });

  it('dentro de la ventana siguen haciendo falta 3 para gatillar un pack nuevo', () => {
    expect(packRegularFaltan([], 4)).toBe(0);
    expect(packRegularFaltan([black(1)], 4)).toBe(2);
    expect(packRegularFaltan([black(2)], 4)).toBe(1);
    expect(packRegularFaltan([black(3)], 4)).toBe(0); // ya paga pack
    expect(packRegularFaltan([black(4)], 4)).toBe(0); // grupo cerrado
    expect(packRegularFaltan([black(5)], 4)).toBe(2);
    expect(packRegularFaltan([black(6)], 4)).toBe(1);
    expect(packRegularFaltan([black(7)], 4)).toBe(0);
    expect(packRegularFaltan([black(8)], 4)).toBe(0);
  });

  it('lo que falta siempre alcanza para el próximo descuento', () => {
    for (const unidades of [3, 4] as const) {
      for (let n = 1; n <= 10; n++) {
        const faltan = packRegularFaltan([black(n)], unidades);
        if (faltan === 0) continue;
        const ahora = computePackRegularDiscount([black(n)], PACK, unidades);
        const despues = computePackRegularDiscount([black(n + faltan)], PACK, unidades);
        expect(despues, `${n} + ${faltan} con grupos de ${unidades}`).toBeGreaterThan(ahora);
      }
    }
  });
});

describe('packRegularCostoSiguiente / packRegularSiguienteGratis', () => {
  it('fuera de la ventana la tercera sale el precio del pack menos las dos puestas', () => {
    expect(packRegularCostoSiguiente([black(2)], PACK, UNIDAD)).toBe(PACK - UNIDAD * 2);
    expect(packRegularSiguienteGratis([black(2)], PACK)).toBe(false);
    expect(packRegularSiguienteGratis([black(3)], PACK)).toBe(false);
  });

  it('dentro de la ventana, con 3 descontadas, la cuarta sale $0', () => {
    expect(packRegularCostoSiguiente([black(3)], PACK, UNIDAD, 4)).toBe(0);
    expect(packRegularSiguienteGratis([black(3)], PACK, 4)).toBe(true);
    expect(packRegularSiguienteGratis([black(7)], PACK, 4)).toBe(true);
  });

  it('no promete nada gratis si el pack no está aplicado', () => {
    expect(packRegularSiguienteGratis([black(2)], PACK, 4)).toBe(false);
    expect(packRegularSiguienteGratis([black(4)], PACK, 4)).toBe(false);
    expect(packRegularSiguienteGratis([], PACK, 4)).toBe(false);
    expect(packRegularSiguienteGratis([black(3)], null, 4)).toBe(false);
    // Individuales más baratas que el pack: no hay descuento, no hay regalo.
    expect(packRegularSiguienteGratis([navy(3, 15000)], PACK, 4)).toBe(false);
  });

  it('sin Regular en el carrito no hay precio de unidad que mirar', () => {
    expect(packRegularMasBarata([])).toBeNull();
    expect(packRegularMasBarata([black(2), navy(1, 15000)])).toBe(15000);
    expect(packRegularCostoSiguiente([], PACK, null)).toBeNull();
  });
});

describe('packRegularEtiqueta', () => {
  it('distingue el fee del evento del pack de siempre', () => {
    expect(packRegularEtiqueta(3)).toBe('Pack Regular x3');
    expect(packRegularEtiqueta(4)).toBe('Pack Regular x4');
    expect(packRegularEtiqueta()).toBe('Pack Regular x3');
  });
});

describe('precioPackRegular', () => {
  it('lee el 3-PACK Black de un Map o de una lista de productos', () => {
    expect(precioPackRegular(new Map([['regular-tees-3-pack-black', PACK]]))).toBe(PACK);
    expect(precioPackRegular([{ slug: 'regular-tees-3-pack-black', price: PACK }])).toBe(PACK);
    expect(precioPackRegular([])).toBeNull();
  });
});
