import { describe, it, expect, vi } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/wp-products', () => ({ fetchProductSlugs: async () => ['regular-tee-black'] }));

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
