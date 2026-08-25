import { describe, it, expect } from 'vitest';
import { FW26_GROUPS, FW26_SLUGS } from '@/lib/fw26';
import { filasCompletas } from '@/lib/home-grid';
import { BASICOS_HOME_ORDER } from '@/lib/regular-tees';
import { MAS_HYPE_HOME_SLUGS } from '@/lib/mas-hype';

// D3: el home se ordena por contribución. Estos tests fijan las decisiones que
// tomamos con datos, para que un reordenamiento futuro no las pise sin querer.
describe('FW26_GROUPS — orden por contribución', () => {
  it('Conjuntos es la primera sección (41% del revenue de 30 días)', () => {
    expect(FW26_GROUPS[0].label).toBe('Conjuntos');
  });

  it('los dos conjuntos HStars y el Pink van juntos en Conjuntos', () => {
    const conjuntos = FW26_GROUPS[0].slugs;
    for (const s of [
      'hoodie-black-hstars', 'sweatpant-black-hstars',
      'hoodie-grey-hstars', 'sweatpant-grey-hstars',
      'hoodie-pink', 'sweatpant-pink',
    ]) expect(conjuntos).toContain(s);
  });

  it('el combo CAMO no se ofrece más: últimas unidades', () => {
    expect(FW26_SLUGS).not.toContain('camo-full-set-combo');
  });

  it('Napoli ya no tiene sección propia: vive en Remeras', () => {
    expect(FW26_GROUPS.some(g => g.label === 'Napoli')).toBe(false);
    const remeras = FW26_GROUPS.find(g => g.label === 'Remeras');
    expect(remeras?.slugs).toContain('napoli-tee-azul');
  });

  it('las Regular Tees y los 3-PACK no van en New In: ya tienen Básicos', () => {
    expect(FW26_SLUGS.some(s => s.startsWith('regular-tee'))).toBe(false);
  });

  it('Half-Zip Navy se mantiene: su tasa de pago baja es de PayPal, no del producto', () => {
    const abrigo = FW26_GROUPS.find(g => g.label === 'Abrigo y Polos');
    expect(abrigo?.slugs).toContain('half-zip-polo-navy');
  });

  it('no quedan slugs duplicados entre secciones', () => {
    expect(new Set(FW26_SLUGS).size).toBe(FW26_SLUGS.length);
  });

  it('el bloque se mantiene simple: 5 secciones como máximo', () => {
    expect(FW26_GROUPS.length).toBeLessThanOrEqual(5);
  });
});

// La grilla del home es de 2 columnas (mobile) y 4 (desktop): si una sección
// trae una cantidad que no es múltiplo de 4, la última fila queda con celdas
// vacías. Las listas curadas se escriben ya cerradas; las filtradas en runtime
// las recorta filasCompletas().
describe('grilla del home — sin celdas vacías', () => {
  it('cada sección de New In cierra en filas de 4', () => {
    for (const g of FW26_GROUPS) {
      expect(g.slugs.length % 4, `la sección "${g.label}" tiene ${g.slugs.length} productos`).toBe(0);
    }
  });

  it('las listas curadas de Básicos y Más Hype también cierran', () => {
    expect(BASICOS_HOME_ORDER.length % 4).toBe(0);
    expect(MAS_HYPE_HOME_SLUGS.length % 4).toBe(0);
  });

  it('filasCompletas recorta al múltiplo de 4 de abajo', () => {
    const n = (len: number) => filasCompletas(Array.from({ length: len }, (_, i) => i)).length;
    expect(n(9)).toBe(8);
    expect(n(8)).toBe(8);
    expect(n(7)).toBe(4);
    expect(n(4)).toBe(4);
  });

  it('con menos de 4 recorta a par, que es lo que cierra en mobile', () => {
    const n = (len: number) => filasCompletas(Array.from({ length: len }, (_, i) => i)).length;
    expect(n(3)).toBe(2);
    expect(n(2)).toBe(2);
    expect(n(1)).toBe(0);
    expect(n(0)).toBe(0);
  });
});
