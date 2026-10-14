import { describe, it, expect } from 'vitest';
import { isRetailChromeHidden, RETAIL_CHROME_HIDDEN_PREFIXES } from '@/lib/retail-chrome';

describe('isRetailChromeHidden', () => {
  it('oculta el chrome minorista en admin, checkout, pago y el portal mayorista', () => {
    for (const p of ['/admin', '/admin/mayoristas', '/checkout', '/pagar/abc', '/mayoristas', '/mayoristas/solicitud', '/mayoristas/producto/x']) {
      expect(isRetailChromeHidden(p)).toBe(true);
    }
  });
  it('lo deja en la tienda', () => {
    for (const p of ['/', '/producto/x', '/colecciones/ss27', '/tees', null, undefined, '']) {
      expect(isRetailChromeHidden(p)).toBe(false);
    }
  });
  it('la lista incluye /mayoristas', () => {
    expect(RETAIL_CHROME_HIDDEN_PREFIXES).toContain('/mayoristas');
  });
});
