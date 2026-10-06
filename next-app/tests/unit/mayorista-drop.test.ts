import { describe, it, expect } from 'vitest';
import { isDropOpenForMayoristas, isDropHighlighted, isDropPrivateProduct, dropInfo, DROP_HIGHLIGHT_DAYS } from '@/lib/mayorista-drop';
import { DEFAULT_CONFIG, type PrivateAccessConfig } from '@/lib/private-access/config';
import { buildMayoristaCatalog } from '@/lib/mayorista-products';

const config: PrivateAccessConfig = { ...DEFAULT_CONFIG, enabled: true };
const before = new Date('2026-10-03T12:00:00-03:00').getTime();
const during = new Date('2026-10-06T12:00:00-03:00').getTime();
const after = new Date('2026-10-12T12:00:00-03:00').getTime();

describe('ventana del drop para mayoristas', () => {
  it('abre con el arranque de Private Access y sigue después de la apertura al público', () => {
    expect(isDropOpenForMayoristas(config, before)).toBe(false);
    expect(isDropOpenForMayoristas(config, during)).toBe(true);
    expect(isDropOpenForMayoristas(config, after)).toBe(true);
  });

  it('pausar o deshabilitar Private Access lo saca también del portal mayorista', () => {
    expect(isDropOpenForMayoristas({ ...config, override: 'force_off' }, during)).toBe(false);
    expect(isDropOpenForMayoristas({ ...config, enabled: false }, during)).toBe(false);
  });

  it('se destaca hasta DROP_HIGHLIGHT_DAYS después de la apertura', () => {
    const open = new Date(config.publicOpenAt).getTime();
    expect(isDropHighlighted(config, open + (DROP_HIGHLIGHT_DAYS - 1) * 86_400_000)).toBe(true);
    expect(isDropHighlighted(config, open + (DROP_HIGHLIGHT_DAYS + 1) * 86_400_000)).toBe(false);
  });

  it('dropInfo arma la fecha de salida al público', () => {
    expect(dropInfo(config, during)).toMatchObject({ tag: 'ss27-part-01', publicOpenLabel: '11.10', beforePublic: true });
    expect(dropInfo(config, after).beforePublic).toBe(false);
  });
});

describe('isDropPrivateProduct', () => {
  const tags = [{ slug: 'ss27-part-01' }];
  it('acepta un privado con el tag de la colección abierta', () => {
    expect(isDropPrivateProduct({ status: 'private', tags }, 'ss27-part-01')).toBe(true);
  });
  it('no acepta privados de otra colección, borradores ni sin drop abierto', () => {
    expect(isDropPrivateProduct({ status: 'private', tags: [{ slug: 'fw26' }] }, 'ss27-part-01')).toBe(false);
    expect(isDropPrivateProduct({ status: 'draft', tags }, 'ss27-part-01')).toBe(false);
    expect(isDropPrivateProduct({ status: 'private', tags }, null)).toBe(false);
  });
});

// Nodos en el shape de WPGraphQL (público) y del mu-plugin de Private Access.
const publicNode = (id: number, slug: string) => ({
  id: `p-${id}`, databaseId: id, name: slug, slug, regularPrice: '$50.000,00',
  productCategories: { nodes: [{ name: 'Remera', slug: 'remera' }] },
  variations: { nodes: [{ stockStatus: 'IN_STOCK', stockQuantity: 10, attributes: { nodes: [{ name: 'pa_talle', value: 'M' }] } }] },
});
const paNode = (id: number, slug: string, status = 'private') => ({
  id: `pa-${id}`, databaseId: id, name: 'STYLE&amp;CULTURE TEE', slug, status, regularPrice: '98000.00',
  productCategories: { nodes: [{ name: 'Hoodie', slug: 'hoodie' }] },
  variations: { nodes: [
    { stockStatus: 'IN_STOCK', stockQuantity: 4, attributes: { nodes: [{ name: 'talle', value: 'S' }] } },
    { stockStatus: 'IN_STOCK', stockQuantity: null, attributes: { nodes: [{ name: 'talle', value: 'M' }] } },
  ] },
});
const info = dropInfo(config, during);

describe('buildMayoristaCatalog con drop', () => {
  it('suma los privados del drop, primero, con precio crudo bien leído y nombre decodificado', () => {
    const out = buildMayoristaCatalog([publicNode(1, 'remera')], { nodes: [paNode(3482, 'hoodie-ss27')], highlighted: true, info });
    expect(out.map(p => p.slug)).toEqual(['hoodie-ss27', 'remera']);
    expect(out[0]).toMatchObject({ drop: true, regularPrice: 98000, wholesalePrice: 49000, name: 'STYLE&CULTURE TEE', sizes: ['S', 'M'] });
    expect(out[1].drop).toBeUndefined();
  });

  it('no duplica cuando el producto ya vino publicado por WPGraphQL (después de la apertura)', () => {
    const out = buildMayoristaCatalog([publicNode(3482, 'hoodie-ss27')], { nodes: [paNode(3482, 'hoodie-ss27', 'publish')], highlighted: true, info: dropInfo(config, after) });
    expect(out).toHaveLength(1);
    expect(out[0].drop).toBe(true);
  });

  it('antes de la apertura, un publicado con el tag no se marca como nuevo (pack de medias)', () => {
    const out = buildMayoristaCatalog([publicNode(3331, 'pack-medias')], { nodes: [paNode(3331, 'pack-medias', 'publish')], highlighted: true, info });
    expect(out[0].drop).toBeUndefined();
  });

  it('sin drop, el catálogo queda igual', () => {
    expect(buildMayoristaCatalog([publicNode(1, 'remera')], null).map(p => p.slug)).toEqual(['remera']);
  });
});
