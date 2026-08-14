import { describe, it, expect } from 'vitest';
import { fromWPNode } from '@/lib/products-normalize';

/**
 * `fromWPNode` es donde nace el precio que ve el comprador. Un error acá
 * publica un precio distinto del que se cobra — el antecedente es el pedido
 * #1747, que se tomó con el precio lleno en vez del de oferta.
 */

const node = (over: Record<string, any> = {}) => ({
  name: 'Hoodie Hype',
  slug: 'hoodie-hype',
  regularPrice: '$100.000',
  salePrice: null,
  price: '$100.000',
  productCategories: { nodes: [{ slug: 'hoodie', name: 'Hoodie' }] },
  productTags: { nodes: [] },
  ...over,
});

describe('fromWPNode — precio', () => {
  it('sin oferta usa el precio regular y no marca descuento', () => {
    const p = fromWPNode(node());
    expect(p.price).toBe(100000);
    expect(p.originalPrice).toBeUndefined();
    expect(p.badge).toBeUndefined();
  });

  it('con oferta usa el precio de oferta y guarda el regular', () => {
    const p = fromWPNode(node({ salePrice: '$70.000', price: '$70.000' }));
    expect(p.price).toBe(70000);
    expect(p.originalPrice).toBe(100000);
    expect(p.badge).toBe('−30%');
  });

  it('parsea el formato de precio de WooCommerce', () => {
    // Separador de miles con punto y decimales con coma.
    expect(fromWPNode(node({ regularPrice: '$1.234,50', price: '$1.234,50' })).price).toBe(1234.5);
  });

  it('cae al precio regular si el activo viene vacío', () => {
    const p = fromWPNode(node({ price: null, salePrice: null }));
    expect(p.price).toBe(100000);
  });

  it('no marca descuento si la oferta no es menor al regular', () => {
    const p = fromWPNode(node({ salePrice: '$100.000', price: '$100.000' }));
    expect(p.originalPrice).toBeUndefined();
    expect(p.badge).toBeUndefined();
  });

  it('un precio sin parsear no genera un badge disparatado', () => {
    const p = fromWPNode(node({ regularPrice: 'Consultar', price: 'Consultar' }));
    expect(p.price).toBe(0);
    expect(p.badge).toBeUndefined();
  });
});

describe('fromWPNode — categoría y peso', () => {
  it('traduce el slug de WP al nombre que ve el cliente', () => {
    expect(fromWPNode(node()).category).toBe('Hoodie');
    expect(
      fromWPNode(node({ productCategories: { nodes: [{ slug: 'remera', name: 'Remera' }] } })).category,
    ).toBe('Tee');
    expect(
      fromWPNode(node({ productCategories: { nodes: [{ slug: 'short', name: 'Short' }] } })).category,
    ).toBe('Jort');
  });

  it('usa el nombre crudo si el slug no está mapeado', () => {
    expect(
      fromWPNode(node({ productCategories: { nodes: [{ slug: 'gorra', name: 'Gorra' }] } })).category,
    ).toBe('Gorra');
  });

  it('no explota si el producto no tiene categoría', () => {
    expect(fromWPNode(node({ productCategories: { nodes: [] } })).category).toBe('');
  });

  it('deja el peso sin definir si Woo trae 0 (así el envío usa su default)', () => {
    expect(fromWPNode(node({ weight: '0' })).weight).toBeUndefined();
    expect(fromWPNode(node({ weight: '0.25' })).weight).toBe(0.25);
  });
});

describe('fromWPNode — talles y stock', () => {
  const conVariaciones = (variations: any[]) =>
    fromWPNode(node({ variations: { nodes: variations } }));

  const v = (value: string, stockStatus = 'IN_STOCK', stockQuantity: number | null = 10) => ({
    stockStatus,
    stockQuantity,
    attributes: { nodes: [{ name: 'talle', value }] },
  });

  it('ordena los talles por tabla, no alfabéticamente', () => {
    const p = conVariaciones([v('XL'), v('S'), v('M'), v('XS')]);
    expect(p.sizes).toEqual(['XS', 'S', 'M', 'XL']);
  });

  it('marca "low" con 3 unidades o menos y "out" sin stock', () => {
    const p = conVariaciones([v('S', 'IN_STOCK', 2), v('M', 'OUT_OF_STOCK', 0), v('L', 'IN_STOCK', 20)]);
    expect(p.stock).toEqual({ S: 'low', M: 'out', L: 'ok' });
  });

  it('un producto sin variaciones queda como talle Única', () => {
    const p = fromWPNode(node({ stockStatus: 'IN_STOCK', stockQuantity: 5 }));
    expect(p.sizes).toEqual(['Única']);
    expect(p.stock['Única']).toBe('ok');
  });

  it('no duplica un talle repetido entre variaciones', () => {
    const p = conVariaciones([v('M'), v('M'), v('L')]);
    expect(p.sizes).toEqual(['M', 'L']);
  });
});

describe('fromWPNode — enlaces e imágenes', () => {
  it('arma el href de la ficha con el slug', () => {
    expect(fromWPNode(node()).href).toBe('/producto/hoodie-hype/');
  });

  it('siempre devuelve al menos una imagen, aunque sea vacía', () => {
    const sinImagen = fromWPNode(node());
    expect(sinImagen.images).toHaveLength(1);
    expect(sinImagen.image).toBe('');

    const conImagen = fromWPNode(node({ image: { sourceUrl: 'https://cdn/x.jpg' } }));
    expect(conImagen.image).toBe('https://cdn/x.jpg');
  });

  it('mapea los tags a sus slugs', () => {
    const p = fromWPNode(node({ productTags: { nodes: [{ slug: 'fw26' }, { slug: 'new-in' }] } }));
    expect(p.tags).toEqual(['fw26', 'new-in']);
  });
});
