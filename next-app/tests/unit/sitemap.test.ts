import { describe, it, expect, vi } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/wp-products', () => ({ fetchProductSlugs: async () => ['regular-tee-black', 'gift-card', 'par-de-medias-hype'], fetchAllProducts: async () => [] }));

import sitemap from '@/app/sitemap';

// Rutas con page.tsx que NO van al sitemap, cada una por un motivo:
// transaccionales y privadas llevan noindex en su propio HTML; el resto
// no es una página de destino.
const FUERA_DEL_SITEMAP = new Set([
  'acceso', 'admin', 'checkout', 'confirmacion', 'pendiente-de-pago', 'seguimiento',
  'subir-foto-final', 'resena', 'private-access', 'mayoristas',
]);

const APP = join(__dirname, '..', '..', 'app');

function paginasPublicas(dir: string, prefijo: string): string[] {
  return readdirSync(join(APP, dir), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('[') && !d.name.startsWith('(') && !d.name.startsWith('_'))
    .filter((d) => existsSync(join(APP, dir, d.name, 'page.tsx')))
    .map((d) => `${prefijo}/${d.name}`);
}

describe('sitemap', () => {
  it('incluye toda página pública estática (una página nueva sin sitemap rompe este test)', async () => {
    const urls = new Set((await sitemap()).map((e) => e.url.replace('https://hypestyle.com.ar', '')));
    const publicas = [
      ...paginasPublicas('.', '').filter((p) => !FUERA_DEL_SITEMAP.has(p.slice(1))),
      ...paginasPublicas('colecciones', '/colecciones'),
    ];
    expect(publicas.filter((p) => !urls.has(p))).toEqual([]);
  });

  it('suma /longsleeves y /colaboraciones', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain('https://hypestyle.com.ar/longsleeves');
    expect(urls).toContain('https://hypestyle.com.ar/colaboraciones');
  });

  it('ninguna URL con barra final ni duplicada', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.filter((u) => u !== 'https://hypestyle.com.ar/' && u.endsWith('/'))).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('sitemap — fase 2 de huérfanas', () => {
  it('saca /novedades (redirige a /new-in) y los productos técnicos', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).not.toContain('https://hypestyle.com.ar/novedades');
    expect(urls).not.toContain('https://hypestyle.com.ar/producto/gift-card');
    expect(urls).not.toContain('https://hypestyle.com.ar/producto/par-de-medias-hype');
    expect(urls).toContain('https://hypestyle.com.ar/producto/regular-tee-black');
  });

  it('/novedades redirige 301 a /new-in', async () => {
    const config = (await import('../../next.config.mjs')).default;
    const redirects = await config.redirects();
    expect(redirects).toContainEqual(expect.objectContaining({ source: '/novedades', destination: '/new-in', permanent: true }));
  });
});

describe('buildMetadata — noindex con follow para los productos técnicos', () => {
  it('index false, follow true', async () => {
    const { buildMetadata } = await import('@/lib/seo');
    expect(buildMetadata({ title: 'Gift Card', description: 'x', path: '/producto/gift-card', noindex: true, follow: true }).robots)
      .toEqual({ index: false, follow: true });
    expect(buildMetadata({ title: 'x', description: 'x', path: '/x', noindex: true }).robots).toEqual({ index: false, follow: false });
  });
});
