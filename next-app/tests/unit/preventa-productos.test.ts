import { describe, it, expect } from 'vitest';
import { preventaDe, CAMO_PREVENTA_LANZAMIENTO } from '@/lib/preventa-productos';
import { CYBER_DROPS } from '@/lib/cyber-cartelera';

describe('preventa camo — nota en ficha', () => {
  it('no aparece antes del lanzamiento', () => {
    const antes = new Date(new Date(CAMO_PREVENTA_LANZAMIENTO).getTime() - 60_000);
    expect(preventaDe('zip-hoodie-camo', antes)).toBeNull();
  });
  it('desde el lanzamiento, las 4 fichas camo muestran la fecha exacta', () => {
    const t = new Date(CAMO_PREVENTA_LANZAMIENTO);
    for (const slug of ['zip-hoodie-camo', 'zip-hoodie-camo-olive', 'jort-camo-olive', 'jort-camo-brown']) {
      expect(preventaDe(slug, t)?.nota).toBe('PREVENTA · Entrega estimada a partir del viernes 13 de noviembre de 2026.');
    }
  });
  it('un producto cualquiera no es preventa', () => {
    expect(preventaDe('lettering-pink-jort', new Date('2026-11-05T12:00:00-03:00'))).toBeNull();
  });
  it('cada prenda camo de Los drops tiene su nota de preventa', () => {
    const t = new Date(CAMO_PREVENTA_LANZAMIENTO);
    const camo = CYBER_DROPS.find((d) => d.id === '02')!.producto!.piezas!;
    for (const p of camo) expect(preventaDe(p.slug!, t), p.slug!).not.toBeNull();
  });
});
