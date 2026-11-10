import { describe, it, expect } from 'vitest';
import { preventaDe, camoEnPreventa, CAMO_PREVENTA_FIN } from '@/lib/preventa-productos';

// 9/11: la preventa Camo se comunica hasta el viernes 13/11 inclusive y se
// borra sola el sábado 14/11 00:00 ART (ficha y /colecciones/camo-drop).
describe('preventa Camo con fecha de fin', () => {
  const slugs = ['zip-hoodie-camo', 'zip-hoodie-camo-olive', 'jort-camo-olive', 'jort-camo-brown'];

  it('el 13/11 a las 23:59 ART sigue en preventa', () => {
    const t = new Date('2026-11-13T23:59:00-03:00');
    expect(camoEnPreventa(t)).toBe(true);
    for (const s of slugs) expect(preventaDe(s, t)).not.toBeNull();
  });

  it('desde el 14/11 00:00 ART ya no se muestra', () => {
    const t = new Date(CAMO_PREVENTA_FIN);
    expect(camoEnPreventa(t)).toBe(false);
    for (const s of slugs) expect(preventaDe(s, t)).toBeNull();
  });

  it('antes del lanzamiento tampoco', () => {
    expect(camoEnPreventa(new Date('2026-11-01T12:00:00-03:00'))).toBe(false);
  });
});
