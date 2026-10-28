import { describe, it, expect } from 'vitest';
import {
  descuentoCupon,
  lineasExcluidasDelCupon,
  faltaElegibilidad,
  type CuponAplicado,
  type LineaCupon,
} from '@/lib/cupon-lineas';

// Productos reales de la lista de exclusiones de HYPE10 (ids vivos del cupón,
// verificados el 28/10/2026 contra wc/v3/coupons): 436 y 2653 son Regular Tees.
const EXCL_436 = { id: 'regular-tee-black', product_id: 436, eligible: false };
const EXCL_2653 = { id: 'regular-tee-melange', product_id: 2653, eligible: false };
const ELEG_777 = { id: 'hoodie-ss27', product_id: 777, eligible: true };
const GIFT = { id: 'gift-card', product_id: 0, eligible: true };

const hype10 = (items?: CuponAplicado['items']): CuponAplicado => ({ type: 'percent', amount: 10, items });

describe('descuentoCupon — paridad con lo que Woo descuenta al crear el pedido', () => {
  it('sin información de elegibilidad descuenta sobre todo el subtotal (backend viejo)', () => {
    const lineas: LineaCupon[] = [{ id: 'regular-tee-black', price: 66300, quantity: 1 }];
    expect(descuentoCupon(lineas, hype10())).toBe(6630);
  });

  it('pedido #4048: la única línea está excluida → el cupón no descuenta nada', () => {
    // 28/10/2026: Woo le descontó $6.630 igual (18/18 líneas excluidas cobraron
    // el 10%). Con el blindaje del backend v1.42.1 el pedido sale sin descuento,
    // y el checkout tiene que mostrar ESE número, no el de antes.
    const lineas: LineaCupon[] = [{ id: 'regular-tee-black', price: 66300, quantity: 1 }];
    expect(descuentoCupon(lineas, hype10([EXCL_436]))).toBe(0);
  });

  it('pedido #4025: Regular melange excluido → 0', () => {
    const lineas: LineaCupon[] = [{ id: 'regular-tee-melange', price: 59160, quantity: 1 }];
    expect(descuentoCupon(lineas, hype10([EXCL_2653]))).toBe(0);
  });

  it('carrito mixto: descuenta solo la línea elegible', () => {
    const lineas: LineaCupon[] = [
      { id: 'regular-tee-melange', price: 59160, quantity: 1 },
      { id: 'hoodie-ss27', price: 110000, quantity: 1 },
    ];
    expect(descuentoCupon(lineas, hype10([EXCL_2653, ELEG_777]))).toBe(11000);
  });

  it('cantidades: el 10% va sobre el subtotal de la línea, no sobre el precio unitario', () => {
    const lineas: LineaCupon[] = [{ id: 'hoodie-ss27', price: 28900, quantity: 3 }];
    expect(descuentoCupon(lineas, hype10([ELEG_777]))).toBe(8670);
  });

  it('el pack no cambia la base del cupón: Woo descuenta sobre los subtotales de línea', () => {
    // El descuento del pack viaja como fee_line negativa y NO baja el subtotal
    // de las líneas, que es lo que mira WC_Discounts. Si acá se restara el pack
    // el resumen mostraría menos descuento del que el pedido va a tener.
    const lineas: LineaCupon[] = [
      { id: 'hoodie-ss27', price: 28900, quantity: 1 },
      { id: 'tee-art', price: 28900, quantity: 1 },
      { id: 'tee-faith', price: 28900, quantity: 1 },
    ];
    const items = [
      ELEG_777,
      { id: 'tee-art', product_id: 778, eligible: true },
      { id: 'tee-faith', product_id: 779, eligible: true },
    ];
    expect(descuentoCupon(lineas, hype10(items))).toBe(8670);
  });

  it('una línea que el backend no supo resolver se trata como elegible (es lo que hará Woo)', () => {
    const lineas: LineaCupon[] = [{ id: 'gift-card', price: 50000, quantity: 1 }];
    expect(descuentoCupon(lineas, hype10([GIFT]))).toBe(5000);
  });

  it('un producto agregado después de validar se trata como elegible y se revalida', () => {
    const lineas: LineaCupon[] = [
      { id: 'hoodie-ss27', price: 110000, quantity: 1 },
      { id: 'recien-agregado', price: 20000, quantity: 1 },
    ];
    const cupon = hype10([ELEG_777]);
    expect(descuentoCupon(lineas, cupon)).toBe(13000);
    expect(faltaElegibilidad(lineas, cupon)).toBe(true);
  });

  it('cupón de monto fijo: es de carrito, no se excluye nada y nunca pasa el subtotal', () => {
    const lineas: LineaCupon[] = [{ id: 'regular-tee-black', price: 66300, quantity: 1 }];
    expect(descuentoCupon(lineas, { type: 'fixed', amount: 5000 })).toBe(5000);
    expect(descuentoCupon([{ id: 'x', price: 3000, quantity: 1 }], { type: 'fixed', amount: 5000 })).toBe(3000);
  });

  it('sin cupón no hay descuento', () => {
    expect(descuentoCupon([{ id: 'x', price: 3000, quantity: 1 }], null)).toBe(0);
  });

  it('carrito vacío no rompe', () => {
    expect(descuentoCupon([], hype10([ELEG_777]))).toBe(0);
  });

  it('redondeo: trunca por centavos como WC_Discounts::apply_coupon_percent', () => {
    // Woo hace floor() sobre los centavos de cada línea, no round() sobre el total.
    const lineas: LineaCupon[] = [{ id: 'hoodie-ss27', price: 1.11, quantity: 1 }];
    expect(descuentoCupon(lineas, hype10([ELEG_777]))).toBe(0.11);
  });

  it('el 100% excluido de un carrito de varias líneas también da 0', () => {
    const lineas: LineaCupon[] = [
      { id: 'regular-tee-black', price: 66300, quantity: 1 },
      { id: 'regular-tee-melange', price: 59160, quantity: 2 },
    ];
    expect(descuentoCupon(lineas, hype10([EXCL_436, EXCL_2653]))).toBe(0);
  });
});

describe('lineasExcluidasDelCupon — el cartel del resumen', () => {
  it('lista las líneas que no cobran el descuento', () => {
    const lineas: LineaCupon[] = [
      { id: 'regular-tee-black', price: 66300, quantity: 1 },
      { id: 'hoodie-ss27', price: 110000, quantity: 1 },
    ];
    expect(lineasExcluidasDelCupon(lineas, hype10([EXCL_436, ELEG_777])).map((l) => l.id)).toEqual(['regular-tee-black']);
  });

  it('sin elegibilidad informada no hay nada que avisar', () => {
    const lineas: LineaCupon[] = [{ id: 'regular-tee-black', price: 66300, quantity: 1 }];
    expect(lineasExcluidasDelCupon(lineas, hype10())).toEqual([]);
    expect(faltaElegibilidad(lineas, hype10())).toBe(false);
  });

  it('con todas las líneas informadas no falta nada que revalidar', () => {
    const lineas: LineaCupon[] = [{ id: 'hoodie-ss27', price: 110000, quantity: 1 }];
    expect(faltaElegibilidad(lineas, hype10([ELEG_777]))).toBe(false);
  });
});
