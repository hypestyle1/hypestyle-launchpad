import { describe, expect, it } from 'vitest';
import { prerenderizarFichas } from '@/lib/build-env';

// Incidente MySQL 4/11/2026: ninguna build prerenderiza las ~110 fichas
// (≈220 consultas GraphQL contra WordPress) salvo que se pida explícitamente.
describe('prerenderizarFichas', () => {
  it('producción de Vercel: no prerenderiza (la ficha se genera en la primera visita y queda en caché)', () => {
    expect(prerenderizarFichas({ VERCEL_ENV: 'production' })).toBe(false);
  });
  it('preview de Vercel y CI: no prerenderiza', () => {
    expect(prerenderizarFichas({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(prerenderizarFichas({ CI: 'true' })).toBe(false);
  });
  it('se puede volver a prerenderizar con PRERENDER_FICHAS=1', () => {
    expect(prerenderizarFichas({ VERCEL_ENV: 'production', PRERENDER_FICHAS: '1' })).toBe(true);
  });
});
