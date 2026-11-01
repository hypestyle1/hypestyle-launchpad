import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import prices from '@/lib/cyber-price-preview.json';

describe('previsualización Cyber de solo presentación', () => {
  it('usa las referencias efectivas verificadas, sin inventar precios Mystery', () => {
    expect(prices['regular-tee-black']).toEqual({ price: 25900, originalPrice: 28900 });
    expect(prices['regular-tees-3-pack-black-white-melange']).toEqual({ price: 59900, originalPrice: 66300 });
    expect(prices['sweatpant-pink']).toEqual({ price: 31950, originalPrice: 63900 });
    for (const [slug, p] of Object.entries(prices)) {
      expect(slug).not.toMatch(/^mystery-/);
      expect(p.price).toBeGreaterThan(0);
      expect(p.originalPrice).toBeGreaterThan(p.price);
    }
  });
  it('conserva el importe real al agregar al carrito', () => {
    const src = readFileSync(join(process.cwd(), 'components/ProductCard.tsx'), 'utf8');
    expect(src).toContain('add({ id, name, price, image, size, quantity: 1 })');
    expect(src).not.toMatch(/add\(\{[^}]*shownPrice/);
  });
  it('la portada original de Drop 01 está disponible y su destino es longsleeves', () => {
    expect(existsSync(join(process.cwd(), 'public/cyber/drops/drop-01-definitivo.png'))).toBe(true);
    const src = readFileSync(join(process.cwd(), 'lib/cyber-cartelera.ts'), 'utf8');
    expect(src).toContain("href: '/longsleeves'");
  });
});
