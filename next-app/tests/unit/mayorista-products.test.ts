import { describe, it, expect } from 'vitest';
import { isExcludedFromMayorista, normalizeMayoristaNode, sizeLevel, stockKey, canOrder, isPurchasable, isUnconfirmed, buildMayoristaCatalog } from '@/lib/mayorista-products';

/**
 * El catálogo mayorista solo modelaba el talle: cualquier otro atributo de la
 * variación se descartaba. Un mayorista no tenía forma de pedir "la AERO
 * negra" aunque Woo la describiera como disponible en tres colores.
 */

const variation = (attrs: Record<string, string>, qty = 10) => ({
  stockStatus: qty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
  stockQuantity: qty,
  attributes: { nodes: Object.entries(attrs).map(([name, value]) => ({ name, value })) },
});

const node = (over: Record<string, any> = {}) => ({
  name: 'AEROBLUE – TEEs',
  slug: 'aeroblue-tees',
  regularPrice: '$&nbsp;45.000,00',
  productCategories: { nodes: [{ name: 'Remera', slug: 'remera' }] },
  attributes: { nodes: [{ name: 'Talle', options: ['S', 'M'] }, { name: 'Fit', options: ['Regular'] }] },
  variations: { nodes: [variation({ Talle: 'S' }, 19), variation({ Talle: 'M' }, 3)] },
  ...over,
});

describe('isExcludedFromMayorista', () => {
  it('saca packs, sets y la Gift Card; deja la mercadería', () => {
    const withCat = (slug: string) => ({ slug: 'x', productCategories: { nodes: [{ name: slug, slug }] } });
    expect(isExcludedFromMayorista(withCat('gift-card'))).toBe(true);
    expect(isExcludedFromMayorista(withCat('pack'))).toBe(true);
    expect(isExcludedFromMayorista(withCat('remera'))).toBe(false);
    expect(isExcludedFromMayorista({ slug: 'hs-ring-silver-925', productCategories: { nodes: [] } })).toBe(true);
  });
});

describe('normalizeMayoristaNode — color', () => {
  it('sin atributo Color no ofrece colores y el stock queda por talle', () => {
    const p = normalizeMayoristaNode(node());
    expect(p.colors).toEqual([]);
    expect(p.colorAxis).toBe(false);
    expect(p.sizes).toEqual(['S', 'M']);
    expect(p.stock).toEqual({ S: 'ok', M: 'low' });
    expect(stockKey(p, 'M', undefined)).toBe('M');
  });

  it('Color informativo del producto (caso AERO): lista los colores, stock compartido por talle', () => {
    const p = normalizeMayoristaNode(node({
      attributes: { nodes: [
        { name: 'Talle', options: ['S', 'M'] },
        { name: 'Color', options: ['Blanco', 'Gris melange', 'Negro'] },
      ] },
    }));
    expect(p.colors).toEqual(['Blanco', 'Gris melange', 'Negro']);
    expect(p.colorAxis).toBe(false);
    // El color no parte el stock: la clave sigue siendo el talle.
    expect(stockKey(p, 'M', 'Negro')).toBe('M');
    expect(p.stock[stockKey(p, 'M', 'Negro')]).toBe('low');
    expect(sizeLevel(p, 'S')).toBe('ok');
  });

  it('Color como eje de variación (Color + Talle): stock por color y talle, sin colapsar', () => {
    const p = normalizeMayoristaNode(node({
      attributes: { nodes: [
        { name: 'Color', options: ['White', 'Black'] },
        { name: 'Talle', options: ['S', 'M'] },
      ] },
      variations: { nodes: [
        variation({ Color: 'White', Talle: 'S' }, 0),
        variation({ Color: 'White', Talle: 'M' }, 8),
        variation({ Color: 'Black', Talle: 'S' }, 2),
        // Black M no existe en Woo: tiene que quedar como agotado, no undefined.
      ] },
    }));
    expect(p.colorAxis).toBe(true);
    expect(p.colors).toEqual(['White', 'Black']);
    expect(p.sizes).toEqual(['S', 'M']);
    expect(p.stock[stockKey(p, 'S', 'White')]).toBe('out');
    expect(p.stock[stockKey(p, 'S', 'Black')]).toBe('low');
    expect(p.stock[stockKey(p, 'M', 'White')]).toBe('ok');
    expect(p.stock[stockKey(p, 'M', 'Black')]).toBe('out');
    // Antes: el talle S tomaba el stock de la primera variación (White, agotada)
    // y Black S quedaba invisible. La disponibilidad del talle es la mejor de sus colores.
    expect(sizeLevel(p, 'S')).toBe('low');
    expect(sizeLevel(p, 'M')).toBe('ok');
  });

  it('Color como único eje (talle único): el color no se confunde con un talle', () => {
    const p = normalizeMayoristaNode(node({
      attributes: { nodes: [{ name: 'Color', options: ['Beige', 'Negro'] }] },
      variations: { nodes: [variation({ Color: 'Beige' }, 4), variation({ Color: 'Negro' }, 0)] },
    }));
    expect(p.colorAxis).toBe(true);
    expect(p.sizes).toEqual(['Única']);
    expect(p.colors).toEqual(['Beige', 'Negro']);
    expect(p.stock[stockKey(p, 'Única', 'Beige')]).toBe('low');
    expect(p.stock[stockKey(p, 'Única', 'Negro')]).toBe('out');
  });

  it('un solo color cargado se lista igual (la UI lo toma por defecto)', () => {
    const p = normalizeMayoristaNode(node({
      attributes: { nodes: [{ name: 'Talle', options: ['S', 'M'] }, { name: 'Color', options: ['Negra'] }] },
    }));
    expect(p.colors).toEqual(['Negra']);
    expect(p.colorAxis).toBe(false);
  });
});

// 13/10/2026: ocho modelos del drop SS27 estaban publicados sin gestión de
// stock (stockQuantity null) y el portal los mostraba como disponibles sin
// límite. Sin cantidad cargada no se puede pedir; "proximamente" tampoco.
describe('normalizeMayoristaNode — stock sin confirmar y próximamente', () => {
  const unmanaged = (attrs: Record<string, string>) => ({ stockStatus: 'IN_STOCK', stockQuantity: null, manageStock: false, attributes: { nodes: Object.entries(attrs).map(([name, value]) => ({ name, value })) } });

  it('variación sin cantidad: "unconfirmed", no "ok"', () => {
    const p = normalizeMayoristaNode(node({ variations: { nodes: [unmanaged({ Talle: 'S' }), variation({ Talle: 'M' }, 3)] } }));
    expect(p.stock).toEqual({ S: 'unconfirmed', M: 'low' });
    expect(p.stockQty.S).toBeNull();
    expect(canOrder(p, p.stock.S)).toBe(false);
    expect(canOrder(p, p.stock.M)).toBe(true);
    expect(isPurchasable(p)).toBe(true);   // el M sí se pide
    expect(isUnconfirmed(p)).toBe(false);
  });

  it('todas las variaciones sin cantidad (caso University tees): visible pero no pedible', () => {
    const p = normalizeMayoristaNode(node({ variations: { nodes: [unmanaged({ Talle: 'S' }), unmanaged({ Talle: 'M' })] } }));
    expect(isPurchasable(p)).toBe(false);
    expect(isUnconfirmed(p)).toBe(true);
    expect(p.sizes.every(s => sizeLevel(p, s) === 'unconfirmed')).toBe(true);
  });

  it('variación que delega en el padre ("parent"): usa la cantidad del producto', () => {
    const p = normalizeMayoristaNode(node({
      manageStock: true, stockQuantity: 4,
      variations: { nodes: [{ ...unmanaged({ Talle: 'S' }), manageStock: 'PARENT' }, { ...unmanaged({ Talle: 'M' }), manageStock: 'PARENT' }] },
    }));
    expect(p.stock).toEqual({ S: 'low', M: 'low' });
    expect(p.stockQty).toEqual({ S: 4, M: 4 });
  });

  it('simple sin gestión (caso Chain Hype): "Única" sin confirmar', () => {
    const p = normalizeMayoristaNode(node({ variations: undefined, attributes: { nodes: [] }, stockStatus: 'IN_STOCK', stockQuantity: null, manageStock: false }));
    expect(p.sizes).toEqual(['Única']);
    expect(p.stock['Única']).toBe('unconfirmed');
    expect(isPurchasable(p)).toBe(false);
  });

  it('simple con cantidad (caso Grey Camo Cap): ok', () => {
    const p = normalizeMayoristaNode(node({ variations: undefined, attributes: { nodes: [] }, stockStatus: 'IN_STOCK', stockQuantity: 28, manageStock: true }));
    expect(p.stock['Única']).toBe('ok');
    expect(isPurchasable(p)).toBe(true);
  });

  it('tag "proximamente": comingSoon, nada se puede pedir aunque haya stock', () => {
    const p = normalizeMayoristaNode(node({ productTags: { nodes: [{ slug: 'ss27-part-01' }, { slug: 'proximamente' }] } }));
    expect(p.comingSoon).toBe(true);
    expect(p.stock).toEqual({ S: 'ok', M: 'low' });
    expect(canOrder(p, 'ok')).toBe(false);
    expect(isPurchasable(p)).toBe(false);
    expect(normalizeMayoristaNode(node()).comingSoon).toBe(false);
  });

  it('la mejor disponibilidad de un talle entre colores ignora los "sin confirmar" si otro color tiene cantidad', () => {
    const p = normalizeMayoristaNode(node({
      attributes: { nodes: [{ name: 'Color', options: ['White', 'Black'] }, { name: 'Talle', options: ['S'] }] },
      variations: { nodes: [unmanaged({ Color: 'White', Talle: 'S' }), variation({ Color: 'Black', Talle: 'S' }, 9)] },
    }));
    expect(sizeLevel(p, 'S')).toBe('ok');
    expect(p.stock[stockKey(p, 'S', 'White')]).toBe('unconfirmed');
  });
});

describe('buildMayoristaCatalog — qué entra y en qué orden', () => {
  const withId = (id: number, slug: string, over: Record<string, any> = {}) => node({ databaseId: id, slug, name: slug, ...over });
  const unmanagedAll = { variations: { nodes: [{ stockStatus: 'IN_STOCK', stockQuantity: null, manageStock: false, attributes: { nodes: [{ name: 'Talle', value: 'S' }] } }] } };
  const outAll = { variations: { nodes: [variation({ Talle: 'S' }, 0)] } };

  it('agotado del todo se oculta; sin confirmar y próximamente se quedan, después de lo pedible', () => {
    const catalog = buildMayoristaCatalog([
      withId(1, 'sin-confirmar', unmanagedAll),
      withId(2, 'agotado', outAll),
      withId(3, 'proximamente', { productTags: { nodes: [{ slug: 'proximamente' }] } }),
      withId(4, 'disponible'),
    ]);
    // Entre los no pedibles, por disponibilidad: próximamente (con stock cargado) antes que sin confirmar.
    expect(catalog.map(p => p.slug)).toEqual(['disponible', 'proximamente', 'sin-confirmar']);
    expect(catalog.map(p => isPurchasable(p))).toEqual([true, false, false]);
  });

  it('el drop sigue primero aunque no se pueda pedir todavía', () => {
    const drop = { nodes: [withId(9, 'drop-privado', { status: 'private', productTags: { nodes: [{ slug: 'proximamente' }] } })], highlighted: true, info: { beforePublic: true } as any };
    const catalog = buildMayoristaCatalog([withId(4, 'disponible')], drop);
    expect(catalog.map(p => [p.slug, !!p.drop, p.comingSoon])).toEqual([['drop-privado', true, true], ['disponible', false, false]]);
  });
});

// 13/10/2026: el mayorista paga 50% de la lista aunque la tienda esté en
// oferta. El precio público de hoy se muestra para que el local sepa contra
// qué compite; no cambia su precio.
describe('normalizeMayoristaNode — precio público de hoy', () => {
  it('con oferta: retailPrice es el precio de hoy, el mayorista sigue siendo 50% de la lista', () => {
    const p = normalizeMayoristaNode(node({ onSale: true, price: '$&nbsp;40.500,00' }));
    expect(p.wholesalePrice).toBe(22500);
    expect(p.retailPrice).toBe(40500);
  });
  it('sin oferta: null (aunque price venga igual a la lista)', () => {
    expect(normalizeMayoristaNode(node({ onSale: false, price: '$&nbsp;45.000,00' })).retailPrice).toBeNull();
    expect(normalizeMayoristaNode(node({ onSale: true, price: '$&nbsp;45.000,00' })).retailPrice).toBeNull();
    expect(normalizeMayoristaNode(node()).retailPrice).toBeNull();
  });
  it('variable con rango "mín - máx": toma el mínimo', () => {
    expect(normalizeMayoristaNode(node({ onSale: true, price: '$&nbsp;40.500,00 - $&nbsp;45.000,00' })).retailPrice).toBe(40500);
  });
});
