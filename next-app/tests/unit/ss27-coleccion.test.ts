import { describe, it, expect } from 'vitest';
import { ss27State, toSs27Products, toCardProps } from '@/lib/ss27-coleccion';
import { DEFAULT_CONFIG, type PrivateAccessConfig } from '@/lib/private-access/config';

const config: PrivateAccessConfig = { ...DEFAULT_CONFIG, enabled: true };
const during = new Date('2026-10-06T12:00:00-03:00').getTime();
const justBefore = new Date('2026-10-10T23:59:59-03:00').getTime();
const atOpen = new Date('2026-10-11T00:00:00-03:00').getTime();

const node = (slug: string, status: string, tags: string[] = ['ss27-part-01']) => ({
  id: `pa-${slug}`,
  name: `STYLE&amp;CULTURE ${slug}`,
  slug,
  status,
  price: '48000.00',
  regularPrice: '60000.00',
  salePrice: '48000.00',
  stockStatus: 'IN_STOCK',
  image: { sourceUrl: `https://x/${slug}.png` },
  galleryImages: { nodes: [] },
  productCategories: { nodes: [{ name: 'Remeras' }] },
  productTags: { nodes: tags.map((t) => ({ slug: t })) },
});

describe('estado de /colecciones/ss27', () => {
  it('antes de publicOpenAt es "before", aunque haya algún producto del tag publicado', () => {
    expect(ss27State(config, 0, during)).toBe('before');
    expect(ss27State(config, 3, justBefore)).toBe('before');
  });

  it('a la hora de apertura: "opening" hasta que el cron publica, después "open"', () => {
    expect(ss27State(config, 0, atOpen)).toBe('opening');
    expect(ss27State(config, 20, atOpen)).toBe('open');
  });

  it('apertura manual desde el panel (openedAt) abre antes de hora', () => {
    expect(ss27State({ ...config, openedAt: '2026-10-09T10:00:00-03:00' }, 20, during)).toBe('open');
  });

  it('force_on (preventa extendida) no abre la página pública', () => {
    expect(ss27State({ ...config, override: 'force_on' }, 0, atOpen)).toBe('before');
  });
});

describe('productos de la colección', () => {
  it('solo los publicados, en el orden del mu-plugin (menu_order), con precios y nombre normalizados', () => {
    const out = toSs27Products([node('b', 'publish'), node('a', 'private'), node('c', 'publish')]);
    expect(out.map((p) => p.slug)).toEqual(['b', 'c']);
    expect(out[0].name).toBe('STYLE&CULTURE b');
    expect(out[0].price).toBe(48000);
    expect(out[0].href).toBe('/producto/b');
  });

  it('includePrivate (preview local) lista también los privados', () => {
    expect(toSs27Products([node('a', 'private')], true)).toHaveLength(1);
  });

  it('proximamente: vidriera sin link, a precio regular', () => {
    const [p] = toSs27Products([node('raglan', 'publish', ['ss27-part-01', 'proximamente'])]);
    expect(p.comingSoon).toBe(true);
    const card = toCardProps(p);
    expect(card.badge).toBe('Próximamente');
    expect(card.disableLink).toBe(true);
    expect(card.price).toBe(60000);
    expect(card.originalPrice).toBeUndefined();
  });
});
