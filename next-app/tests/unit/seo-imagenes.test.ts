import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crawlableImageUrl, buildMetadata } from '@/lib/seo';
import { productJsonLd } from '@/lib/jsonld';
import type { Product } from '@/data/products';

/**
 * El robots.txt del WordPress de Hostinger bloquea a Googlebot entero. Las
 * imágenes que se le declaran a Google (JSON-LD Product y og:image) tienen que
 * salir de hypestyle.com.ar o la ficha pierde el resultado enriquecido.
 */
const WP = 'https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/remera-regular-negra-frente.png';

describe('crawlableImageUrl', () => {
  it('pasa las fotos de WP por /_next/image de hypestyle.com.ar', () => {
    const url = crawlableImageUrl(WP);
    expect(url).toBe(
      `https://hypestyle.com.ar/_next/image?url=${encodeURIComponent(WP)}&w=1200&q=75`,
    );
    expect(new URL(url).hostname).toBe('hypestyle.com.ar');
  });

  it('el ancho es uno de los deviceSizes por defecto de Next (si no, 400)', () => {
    expect([640, 750, 828, 1080, 1200, 1920, 2048, 3840]).toContain(
      Number(new URL(crawlableImageUrl(WP)).searchParams.get('w')),
    );
  });

  it('las rutas locales quedan absolutas en el dominio del sitio', () => {
    expect(crawlableImageUrl('/og-image.png')).toBe('https://hypestyle.com.ar/og-image.png');
    expect(crawlableImageUrl('og-image.png')).toBe('https://hypestyle.com.ar/og-image.png');
  });

  it('no toca URLs de hosts que /_next/image no acepta', () => {
    const otro = 'https://cdn.ejemplo.com/foto.jpg';
    expect(crawlableImageUrl(otro)).toBe(otro);
  });

  it('el host de WP está en images.remotePatterns de next.config', () => {
    const config = readFileSync(join(__dirname, '../../next.config.mjs'), 'utf8');
    expect(config).toContain('hostname: "lightpink-rook-704850.hostingersite.com"');
  });
});

describe('imágenes que ve Google', () => {
  const product = {
    slug: 'regular-tee-black',
    name: 'Regular Tee - Black',
    description: 'Remera',
    category: 'Remera',
    price: 23400,
    images: [WP, ''],
    sizes: ['M'],
    stock: { M: 'in' },
  } as unknown as Product;

  it('el Product JSON-LD no declara ninguna imagen del dominio de WP', () => {
    const ld = productJsonLd(product) as { image: string[] };
    expect(ld.image).toHaveLength(1);
    for (const img of ld.image) expect(new URL(img).hostname).toBe('hypestyle.com.ar');
  });

  it('og:image y twitter:image salen de hypestyle.com.ar', () => {
    const meta = buildMetadata({ title: 'X', description: 'Y', path: '/producto/x/', image: WP });
    const og = (meta.openGraph?.images as { url: string }[])[0].url;
    expect(new URL(og).hostname).toBe('hypestyle.com.ar');
    expect(new URL((meta.twitter?.images as string[])[0]).hostname).toBe('hypestyle.com.ar');
  });
});

describe('robots.txt', () => {
  const robots = readFileSync(join(__dirname, '../../public/robots.txt'), 'utf8');

  // Grupos según RFC 9309: líneas User-agent seguidas forman un grupo.
  function groups() {
    const out: { agents: string[]; rules: string[] }[] = [];
    let current: { agents: string[]; rules: string[] } | null = null;
    for (const raw of robots.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, '').trim();
      if (!line) continue;
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (/^user-agent$/i.test(key)) {
        if (!current || current.rules.length) out.push((current = { agents: [], rules: [] }));
        current.agents.push(value.toLowerCase());
      } else if (current && /^(allow|disallow)$/i.test(key)) {
        current.rules.push(`${key.toLowerCase()}:${value}`);
      }
    }
    return out;
  }
  const rulesFor = (bot: string) =>
    (groups().find(g => g.agents.includes(bot)) ?? groups().find(g => g.agents.includes('*')))!.rules;

  it('ningún grupo deja /admin/ abierto', () => {
    for (const g of groups()) expect(g.rules).toContain('disallow:/admin/');
  });

  it('Googlebot y Bingbot pueden pedir /api/ (lo necesitan para renderizar)', () => {
    expect(rulesFor('googlebot')).not.toContain('disallow:/api/');
    expect(rulesFor('bingbot')).not.toContain('disallow:/api/');
  });

  it('no bloquea rutas que dependen de su noindex', () => {
    for (const bot of ['googlebot', 'bingbot']) {
      const rules = rulesFor(bot).join(' ');
      for (const ruta of ['/private-access', '/checkout', '/acceso', '/mayoristas', '/resena', '/seguimiento']) {
        expect(rules).not.toContain(`disallow:${ruta}`);
      }
    }
  });
});
