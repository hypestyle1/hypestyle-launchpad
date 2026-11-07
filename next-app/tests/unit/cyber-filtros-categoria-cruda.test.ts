import { describe, it, expect } from 'vitest';
import { cyberCategoryMatches } from '@/lib/cyber-catalog-view';
import { CYBER_FILTROS } from '@/lib/cyber-cartelera';

/* Bug 7/11 en producción: el filtro Tees del Catálogo Cyber salía vacío. Los
   precios en vivo (/api/cyber-products-live) traen la categoría con el nombre
   crudo de Woo ("Remera") y el filtro comparaba contra "Tee". Categorías
   crudas tomadas del endpoint en vivo ese día. */
const filtro = (id: string) => CYBER_FILTROS.find((f) => f.id === id)!;

describe('filtros del Catálogo Cyber con categorías crudas de Woo', () => {
  it('Tees acepta "Remera" (crudo) y "Tee" (normalizado)', () => {
    expect(cyberCategoryMatches('Remera', filtro('tees'))).toBe(true);
    expect(cyberCategoryMatches('Tee', filtro('tees'))).toBe(true);
  });
  it('Hoodies acepta Hoodie, Campera y SWEATER', () => {
    for (const c of ['Hoodie', 'Campera', 'SWEATER']) expect(cyberCategoryMatches(c, filtro('hoodies'))).toBe(true);
  });
  it('Bottoms acepta Pantalón y JORT', () => {
    for (const c of ['Pantalón', 'JORT']) expect(cyberCategoryMatches(c, filtro('bottoms'))).toBe(true);
  });
  it('cada categoría cruda del catálogo en vivo cae en algún filtro (salvo Set)', () => {
    const crudas = ['Longsleeve', 'Musculosa', 'Remera', 'Accesorio', 'Hoodie', 'Campera', 'Pantalón', 'JORT', 'Pack', 'Polo', 'SWEATER'];
    const huerfanas = crudas.filter((c) => !CYBER_FILTROS.some((f) => cyberCategoryMatches(c, f)));
    expect(huerfanas).toEqual(['Musculosa']);
  });
  it('no mezcla: una remera no entra en Hoodies', () => {
    expect(cyberCategoryMatches('Remera', filtro('hoodies'))).toBe(false);
  });
});
