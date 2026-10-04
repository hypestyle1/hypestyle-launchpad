import { describe, expect, it } from 'vitest';
import { membersToCsv, parseMembersImport } from '@/lib/private-access/import';
import { fromPrivateNode, stripHtml } from '@/lib/private-access/normalize';

describe('private-access · import de miembros', () => {
  it('CSV con encabezado username,name', () => {
    const r = parseMembersImport('username,name\nvalentinpozzi,Valentin\n@JuanPerez,Juan\nmartina123,Martina');
    expect(r.format).toBe('csv');
    expect(r.rows).toEqual([
      { handle: 'valentinpozzi', name: 'Valentin' },
      { handle: 'juanperez', name: 'Juan' },
      { handle: 'martina123', name: 'Martina' },
    ]);
  });

  it('CSV sin encabezado y una sola columna', () => {
    const r = parseMembersImport('@uno\ndos\n TRES \n');
    expect(r.rows.map((x) => x.handle)).toEqual(['uno', 'dos', 'tres']);
  });

  it('separador ; (Excel en español), BOM y comillas', () => {
    const r = parseMembersImport('﻿Usuario;Nombre\n"@fulano.";"Pérez, Juan"');
    expect(r.rows).toEqual([{ handle: 'fulano', name: 'Pérez, Juan' }]);
  });

  it('deduplica y se queda con el que trae nombre', () => {
    const r = parseMembersImport('username,name\nana,\n@Ana,Ana Gómez');
    expect(r.rows).toEqual([{ handle: 'ana', name: 'Ana Gómez' }]);
  });

  it('reporta inválidos sin cortar el resto', () => {
    const r = parseMembersImport('username\nbueno\nmal usuario!\notro_bueno');
    expect(r.rows.map((x) => x.handle)).toEqual(['bueno', 'otro_bueno']);
    expect(r.invalid).toEqual(['mal usuario!']);
  });

  it('links de perfil pegados', () => {
    const r = parseMembersImport('https://www.instagram.com/Hypestyle/?hl=es');
    expect(r.rows[0].handle).toBe('hypestyle');
  });

  it('JSON del export de Instagram (formato con string_list_data)', () => {
    const json = JSON.stringify({ relationships_close_friends: [
      { title: '', string_list_data: [{ href: 'https://www.instagram.com/uno', value: 'uno', timestamp: 1 }] },
      { title: 'dos', string_list_data: [{ href: 'https://www.instagram.com/_u/dos', timestamp: 2 }] },
    ] });
    const r = parseMembersImport(json);
    expect(r.format).toBe('instagram_json');
    expect(r.rows.map((x) => x.handle)).toEqual(['uno', 'dos']);
  });

  it('export CSV escapa comas y comillas', () => {
    const csv = membersToCsv([{ handle: 'a', name: 'Pérez, "Juan"', source: 'csv', status: 'active', createdAt: null, lastAccessAt: null, accessCount: 0 }]);
    expect(csv.split('\n')[1]).toBe('a,"Pérez, ""Juan""",csv,active,,,0');
  });
});

describe('private-access · normalización de productos del mu-plugin', () => {
  const node = {
    id: 'pa-10', name: 'Athletic Dept Longsleeve Pink', slug: 'athletic-dept-longsleeve-pink',
    price: '46400', regularPrice: '58000', salePrice: '46400', stockStatus: 'IN_STOCK', stockQuantity: null,
    image: { sourceUrl: 'https://x/a.jpg' }, galleryImages: { nodes: [{ sourceUrl: 'https://x/b.jpg' }] },
    productCategories: { nodes: [{ name: 'Longsleeve', slug: 'longsleeve' }] }, productTags: { nodes: [{ slug: 'ss27-part-01' }] },
    variations: { nodes: [
      { stockStatus: 'IN_STOCK', stockQuantity: 10, attributes: { nodes: [{ name: 'pa_talle', value: 'M' }] } },
      { stockStatus: 'OUT_OF_STOCK', stockQuantity: 0, attributes: { nodes: [{ name: 'pa_talle', value: 'L' }] } },
      { stockStatus: 'IN_STOCK', stockQuantity: 2, attributes: { nodes: [{ name: 'pa_talle', value: 'S' }] } },
    ] },
    description: '<p>Algodón <strong>peinado</strong>.</p><p>Fit boxy &amp; oversize.</p>',
  };

  it('arma precio, descuento, talles, stock y link privado', () => {
    const p = fromPrivateNode(node, { saleEndsLabel: '10.10', publicOpenLabel: '11.10' });
    expect(p.price).toBe(46400);
    expect(p.originalPrice).toBe(58000);
    expect(p.badge).toBe('−20%');
    expect(p.sizes).toEqual(['S', 'M', 'L']);
    expect(p.stock).toEqual({ S: 'low', M: 'ok', L: 'out' });
    expect(p.href).toBe('/private-access/athletic-dept-longsleeve-pink');
    expect(p.category).toBe('Longsleeve');
    expect(p.description).toBe('Algodón peinado.\nFit boxy & oversize.');
  });

  it('stripHtml no deja etiquetas', () => {
    expect(stripHtml('<ul><li>uno</li><li>dos</li></ul>')).toBe('uno\ndos');
  });
});
