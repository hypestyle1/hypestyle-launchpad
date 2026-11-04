import { describe, expect, it } from 'vitest';
import { prerenderizarFichas } from '@/lib/build-env';

// Incidente MySQL 4/11/2026: las builds de preview y CI no prerenderizan fichas
// (≈220 consultas GraphQL por build contra WordPress). Producción sí.
describe('prerenderizarFichas', () => {
  it('producción de Vercel: prerenderiza como siempre', () => {
    expect(prerenderizarFichas({ VERCEL_ENV: 'production' })).toBe(true);
  });
  it('build local sin Vercel ni CI: prerenderiza', () => {
    expect(prerenderizarFichas({})).toBe(true);
  });
  it('preview de Vercel: no prerenderiza', () => {
    expect(prerenderizarFichas({ VERCEL_ENV: 'preview' })).toBe(false);
  });
  it('GitHub Actions (CI=true): no prerenderiza', () => {
    expect(prerenderizarFichas({ CI: 'true' })).toBe(false);
  });
});
