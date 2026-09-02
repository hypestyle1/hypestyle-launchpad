import { describe, it, expect } from 'vitest';
import { isExcludedFromMayorista, normalizeMayoristaNode, sizeLevel, stockKey } from '@/lib/mayorista-products';

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
