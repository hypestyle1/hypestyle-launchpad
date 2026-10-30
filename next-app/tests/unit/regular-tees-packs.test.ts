import { describe, it, expect } from 'vitest';
import { REGULAR_TEES_GROUPS, BASICOS_HOME_ORDER, BASICOS_HOME_FEATURED_SLUG } from '@/lib/regular-tees';
import { getColorwaysForSlug } from '@/lib/product-detail';

// Un pack vive en DOS listas curadas a mano y en distintos archivos: la de la
// colección y el home (lib/regular-tees) y la de los puntitos de color de la
// ficha y las cards (lib/product-detail). Agregarlo en una sola es el error
// silencioso de siempre — el pack (Black, Navy, White) estuvo publicado y
// vendible pero invisible desde el 18/08/2026 por exactamente esto.
//
// Estos tests fallan si las dos listas dejan de decir lo mismo.

const PACKS = REGULAR_TEES_GROUPS.find(g => g.label === '3-Packs')!.slugs;

describe('3-PACK de Regular Tees — las listas no se separan', () => {
  it('cada pack de la colección tiene sus colorways en la ficha', () => {
    for (const slug of PACKS) {
      const cw = getColorwaysForSlug(slug);
      expect(cw, `el pack "${slug}" no está en REGULAR_PACK_COLORWAYS`).toBeTruthy();
      expect(cw!.map(c => c.slug), `"${slug}" no se encuentra a sí mismo`).toContain(slug);
    }
  });

  it('los colorways de un pack son exactamente los packs de la colección', () => {
    const desdeLaFicha = getColorwaysForSlug(PACKS[0])!.map(c => c.slug);
    expect([...desdeLaFicha].sort()).toEqual([...PACKS].sort());
  });

  it('están las 10 combinaciones de 3 colores sobre los 5 individuales, más los 4 mono', () => {
    // C(5,3) = 10 surtidos + 4 mono-color = 14.
    expect(PACKS.length).toBe(14);
    expect(new Set(PACKS).size).toBe(PACKS.length);
  });

  it('los 6 packs con roja están en las dos listas', () => {
    const conRoja = PACKS.filter(s => s.startsWith('regular-tees-3-pack-red-'));
    expect(conRoja).toHaveLength(6);
    for (const slug of conRoja) expect(getColorwaysForSlug(slug)).toBeTruthy();
  });

  it('el destacado del home sigue siendo un pack surtido de la colección', () => {
    expect(PACKS).toContain(BASICOS_HOME_FEATURED_SLUG);
    expect(BASICOS_HOME_ORDER[0]).toBe(BASICOS_HOME_FEATURED_SLUG);
  });

  it('todo lo que el home ordena existe en la colección', () => {
    const colección = new Set(REGULAR_TEES_GROUPS.flatMap(g => g.slugs));
    for (const slug of BASICOS_HOME_ORDER) {
      expect(colección.has(slug), `"${slug}" está en el home pero no en la colección`).toBe(true);
    }
  });
});
