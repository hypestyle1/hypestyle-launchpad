import { describe, it, expect } from 'vitest';
import { mezclar } from '@/lib/scramble';

/**
 * El total del checkout se anima con ScrambleText. En modo `numeric` solo
 * ruedan los dígitos: el símbolo, los puntos de miles y la coma se quedan,
 * así el monto nunca se ve como "$ >!;]%,]" (05/09/2026).
 */
describe('ScrambleText numeric', () => {
  const monto = Array.from('$ 147.951');

  it('mantiene símbolo, espacio y puntos; solo cambia dígitos por dígitos', () => {
    for (let i = 0; i < 20; i++) {
      const out = mezclar(monto, 0, false, true);
      expect(out).toMatch(/^\$ \d{3}\.\d{3}$/);
    }
  });

  it('respeta los segmentos ya revelados', () => {
    const out = mezclar(monto, 4, false, true);
    expect(out.startsWith('$ 14')).toBe(true);
    expect(out).toMatch(/^\$ 14\d\.\d{3}$/);
  });

  it('la versión estable (primer render) también es numérica', () => {
    const a = mezclar(Array.from('€ 84.38'), 0, true, true);
    const b = mezclar(Array.from('€ 84.38'), 0, true, true);
    expect(a).toBe(b);
    expect(a).toMatch(/^€ \d{2}\.\d{2}$/);
  });

  it('sin numeric sigue usando símbolos (comportamiento anterior)', () => {
    const out = mezclar(Array.from('HYPE'), 0, true, false);
    expect(out).toHaveLength(4);
    expect(out).not.toBe('HYPE');
    expect(out).toMatch(/^[^A-Za-z0-9]{4}$/);
  });
});
