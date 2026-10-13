import { describe, it, expect } from 'vitest';
import { esFirst10, errorEsDeCupon, regaloFirst10DeLineas, textoFirst10, FIRST10_LINE_META } from '@/lib/first10';

describe('first10', () => {
  it('reconoce el código sin importar mayúsculas ni espacios', () => {
    expect(esFirst10('first10')).toBe(true);
    expect(esFirst10(' FIRST10 ')).toBe(true);
    expect(esFirst10('HYPE10')).toBe(false);
    expect(esFirst10(undefined)).toBe(false);
  });

  it('distingue un error de cupón de WC REST de otros errores', () => {
    expect(errorEsDeCupon(400, '{"code":"woocommerce_rest_invalid_coupon","message":"Cupón inválido"}')).toBe(true);
    expect(errorEsDeCupon(400, '{"code":"woocommerce_rest_coupon_usage_limit_reached","message":"Coupon usage limit has been reached."}')).toBe(true);
    expect(errorEsDeCupon(400, '{"code":"woocommerce_rest_invalid_product_id"}')).toBe(false);
    expect(errorEsDeCupon(500, 'coupon')).toBe(false);
  });

  it('encuentra la línea de regalo por su meta y la deja a $0', () => {
    const lineas = [
      { name: 'Hype – Distressed Grey Hoodie', quantity: 1, total: '110000', meta_data: [] },
      { name: 'Pack x3 Medias Hype White — Regalo FIRST10', quantity: 1, total: '0', meta_data: [{ key: FIRST10_LINE_META, value: 'yes' }] },
    ];
    expect(regaloFirst10DeLineas(lineas)).toEqual({ name: 'Pack x3 Medias Hype White — Regalo FIRST10', size: 'Único', quantity: 1, price: 0 });
    expect(regaloFirst10DeLineas([lineas[0]])).toBeNull();
    expect(regaloFirst10DeLineas(undefined)).toBeNull();
  });

  it('arma el texto del checkout con singular y plural', () => {
    const base = { product_id: 3331, name: 'Pack x3 Medias Hype White', slug: 'pack-x3-medias-hype-white', min: 100000 };
    expect(textoFirst10({ ...base, remaining: 1 })).toContain('queda 1 regalo');
    expect(textoFirst10({ ...base, remaining: 7 })).toContain('quedan 7 regalos');
  });
});
