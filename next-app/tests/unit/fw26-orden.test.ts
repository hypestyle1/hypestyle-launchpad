import { describe, it, expect } from 'vitest';
import { FW26_GROUPS, FW26_SLUGS } from '@/lib/fw26';

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
      'hoodie-pink', 'zip-hoodie-pink', 'sweatpant-pink',
    ]) expect(conjuntos).toContain(s);
  });

  it('el combo CAMO no se ofrece más: últimas unidades', () => {
    expect(FW26_SLUGS).not.toContain('camo-full-set-combo');
  });

  it('Napoli ya no tiene sección propia: vive en Remeras y Packs', () => {
    expect(FW26_GROUPS.some(g => g.label === 'Napoli')).toBe(false);
    const remeras = FW26_GROUPS.find(g => g.label === 'Remeras y Packs');
    expect(remeras?.slugs).toContain('napoli-tee-azul');
  });

  it('los 3-PACK Regular entran al home', () => {
    const remeras = FW26_GROUPS.find(g => g.label === 'Remeras y Packs');
    expect(remeras?.slugs.some(s => s.startsWith('regular-tees-3-pack'))).toBe(true);
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
