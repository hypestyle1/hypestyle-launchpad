import { describe, it, expect } from 'vitest';
import { descuentos } from '@/lib/precio-servidor';
import {
  PACK_REGULAR_X4_DESDE,
  PACK_REGULAR_X4_GRACIA_MS,
  PACK_REGULAR_X4_HASTA,
  PACK_REGULAR_X4_PRECIO,
  packRegularUnidades,
  packRegularUnidadesAlCobrar,
  unidadesPackRegularDeStatus,
  type PackRegularUnidades,
} from '@/lib/promo-pack-regular';

/**
 * GARANTÍA: el cliente nunca termina pagando más que el precio promocional que
 * vio.
 *
 * El tamaño del pack lo deciden dos relojes distintos: el carrito pregunta por
 * /api/pack-regular-status (y lo refresca cada 5 minutos) y el servidor lo
 * resuelve de nuevo al crear el pedido. Cuando los dos no coinciden hay dos
 * casos y solo uno es peligroso:
 *
 * - Muestra 3 y cobra 4 (falla la consulta de ventana, o el pedido entra justo
 *   después de que abrió): se cobra de MENOS. Inofensivo.
 * - Muestra 4 y cobra 3 (el pedido entra justo después de que cerró): se
 *   cobraría de MÁS. Lo tapa la gracia al cobrar (PACK_REGULAR_X4_GRACIA_MS) y,
 *   más allá de la gracia, la guarda del checkout que compara el total de Woo
 *   contra el que se mostró (`authorizedTotal` vs `montoAPagar` en
 *   app/checkout/page.tsx): muestra el total nuevo y no cobra nada hasta que el
 *   cliente lo acepta.
 */
const CATALOGO_3PACK = 66300;
const UNIDAD = 23400;
const CUATRO_REGULAR = [{ id: 'regular-tee-black', price: UNIDAD, quantity: 4 }];
const base = {
  metodo: 'tarjeta',
  internacional: false,
  campeonActivo: false,
  tresPorDosActivo: false,
  precioPackRegular: CATALOGO_3PACK,
};

/** Lo que se paga por 4 Regular individuales con un tamaño de pack dado. */
function pagaPorCuatro(unidades: PackRegularUnidades): number {
  return UNIDAD * 4 - descuentos(CUATRO_REGULAR, { ...base, unidadesPackRegular: unidades }).monto;
}

describe('falla el cálculo del pack de 4 en el navegador', () => {
  it('si /api/pack-regular-status no responde, el carrito cae al pack de 3', () => {
    expect(unidadesPackRegularDeStatus(undefined)).toBe(3); // mientras carga
    expect(unidadesPackRegularDeStatus(null)).toBe(3); // el fetch falló o cortó por timeout
    expect(unidadesPackRegularDeStatus({})).toBe(3); // 500 con un body cualquiera
    expect(unidadesPackRegularDeStatus({ unidades: '4' })).toBe(3); // ni siquiera un 4 de texto
    expect(unidadesPackRegularDeStatus({ unidades: 4 })).toBe(4); // la respuesta buena
  });

  it('con ese fallback el cliente paga MENOS de lo mostrado, nunca más', () => {
    const mostrado = pagaPorCuatro(3); // lo que vio con el fallback
    const cobrado = pagaPorCuatro(4); // lo que cobra el servidor, que sí sabe la hora
    expect(cobrado).toBeLessThan(mostrado);
    expect(cobrado).toBe(PACK_REGULAR_X4_PRECIO);
    expect(mostrado - cobrado).toBe(UNIDAD);
  });
});

describe('el caso inverso: mostró 4 y el servidor resuelve 3', () => {
  it('es el único desajuste que cobraría de más', () => {
    expect(pagaPorCuatro(3)).toBeGreaterThan(pagaPorCuatro(4));
    expect(pagaPorCuatro(3) - pagaPorCuatro(4)).toBe(UNIDAD);
  });

  it('la gracia al cobrar cubre el refresco del carrito con margen', () => {
    // El hook refresca cada 5 minutos: la gracia tiene que ser al menos eso.
    expect(PACK_REGULAR_X4_GRACIA_MS).toBeGreaterThanOrEqual(5 * 60_000);
  });

  it('dentro de la ventana mostrar y cobrar coinciden siempre', () => {
    for (const t of [
      PACK_REGULAR_X4_DESDE,
      PACK_REGULAR_X4_DESDE + 60 * 60_000,
      PACK_REGULAR_X4_HASTA - 1,
    ]) {
      expect(packRegularUnidades(t)).toBe(4);
      expect(packRegularUnidadesAlCobrar(t)).toBe(4);
    }
  });

  it('al cerrar se deja de mostrar el pack de 4 pero se sigue cobrando 10 minutos', () => {
    expect(packRegularUnidades(PACK_REGULAR_X4_HASTA)).toBe(3);
    expect(packRegularUnidadesAlCobrar(PACK_REGULAR_X4_HASTA)).toBe(4);
    expect(packRegularUnidadesAlCobrar(PACK_REGULAR_X4_HASTA + PACK_REGULAR_X4_GRACIA_MS - 1)).toBe(4);
    expect(packRegularUnidadesAlCobrar(PACK_REGULAR_X4_HASTA + PACK_REGULAR_X4_GRACIA_MS)).toBe(3);
  });

  it('al abrir no hay gracia: antes de la ventana el pack de 4 no existe', () => {
    // No hace falta y sería regalar el precio antes de anunciarlo: ahí el
    // desajuste va para el otro lado (se muestra 3 y se cobra 4, de menos).
    expect(packRegularUnidadesAlCobrar(PACK_REGULAR_X4_DESDE - 1)).toBe(3);
    expect(packRegularUnidadesAlCobrar(PACK_REGULAR_X4_DESDE - PACK_REGULAR_X4_GRACIA_MS)).toBe(3);
  });
});

describe('bordes del cambio de ventana', () => {
  /** Lo que muestra el carrito en un instante (lo resuelve la ruta de status). */
  const muestra = (iso: string) => packRegularUnidades(Date.parse(iso));
  /** Lo que cobra el servidor al crear el pedido en un instante. */
  const cobra = (iso: string) => packRegularUnidadesAlCobrar(Date.parse(iso));

  it('carrito armado 18:59 del 1/11 y pagado 19:01: se cobra menos de lo mostrado', () => {
    const vio = muestra('2026-11-01T18:59:00-03:00');
    const cobrado = cobra('2026-11-01T19:01:00-03:00');
    expect(vio).toBe(3);
    expect(cobrado).toBe(4);
    expect(pagaPorCuatro(cobrado)).toBeLessThan(pagaPorCuatro(vio));
  });

  it('carrito armado 23:59 del 4/11 y pagado 00:01 del 5/11: se cobra justo lo mostrado', () => {
    const vio = muestra('2026-11-04T23:59:00-03:00');
    const cobrado = cobra('2026-11-05T00:01:00-03:00');
    expect(vio).toBe(4);
    expect(cobrado).toBe(4); // la gracia
    expect(pagaPorCuatro(cobrado)).toBe(pagaPorCuatro(vio));
    expect(pagaPorCuatro(cobrado)).toBe(PACK_REGULAR_X4_PRECIO);
  });

  it('pasada la gracia (00:30 del 5/11) el servidor cobra el pack de 3 y el checkout tiene que avisar', () => {
    const vio = muestra('2026-11-04T23:59:00-03:00');
    const cobrado = cobra('2026-11-05T00:30:00-03:00');
    expect(cobrado).toBe(3);
    // Acá el total cobrado es mayor que el mostrado: lo corta la guarda del
    // checkout (authorizedTotal vs montoAPagar), que muestra el total nuevo y
    // no cobra nada hasta que el cliente lo acepta.
    expect(pagaPorCuatro(cobrado) - pagaPorCuatro(vio)).toBe(UNIDAD);
  });
});
