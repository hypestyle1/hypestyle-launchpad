import { describe, it, expect } from 'vitest';
import { cleanStockAlertInput, validateStockAlert, uniqueEmails } from '@/lib/stock-alerts';
import type { NormalizedProduct } from '@/lib/products-normalize';

const HOODIE: NormalizedProduct = {
  id: 'hoodie-grey-hstars', slug: 'hoodie-grey-hstars', name: 'Hoodie Grey HStars',
  category: 'Hoodie', price: 80100, image: '', images: [''], href: '/producto/hoodie-grey-hstars/',
  sizes: ['S', 'M', 'L', 'XL'], stock: { S: 'ok', M: 'low', L: 'ok', XL: 'out' }, tags: [],
};
const CATALOG = [HOODIE];

const base = { email: 'alguien@mail.com', phone: '', slug: 'hoodie-grey-hstars', size: 'XL', lang: 'ES' };

describe('cleanStockAlertInput', () => {
  it('recorta espacios y normaliza mail, slug e idioma', () => {
    const out = cleanStockAlertInput({ email: '  Alguien@Mail.com ', slug: ' Hoodie-Grey-HStars', size: ' XL ', lang: 'pt' });
    expect(out).toEqual({ email: 'alguien@mail.com', phone: '', slug: 'hoodie-grey-hstars', size: 'XL', lang: 'PT' });
  });

  it('un cuerpo que no es objeto queda vacío en vez de romper', () => {
    expect(cleanStockAlertInput(null).email).toBe('');
    expect(cleanStockAlertInput('hola').slug).toBe('');
  });

  it('ignora campos que no son texto', () => {
    const out = cleanStockAlertInput({ email: 123, slug: ['x'], size: { a: 1 } });
    expect(out.email).toBe('');
    expect(out.slug).toBe('');
    expect(out.size).toBe('');
  });

  it('sin idioma asume español', () => {
    expect(cleanStockAlertInput({}).lang).toBe('ES');
  });
});

describe('validateStockAlert', () => {
  it('acepta un talle agotado de un producto que existe', () => {
    const res = validateStockAlert(base, CATALOG);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.product.name).toBe('Hoodie Grey HStars');
  });

  it('acepta un talle que el catálogo todavía da como disponible', () => {
    // La página de producto consulta el stock en vivo y puede saber antes que
    // el catálogo cacheado que ese talle se agotó.
    expect(validateStockAlert({ ...base, size: 'M' }, CATALOG).ok).toBe(true);
  });

  it('rechaza un mail mal escrito', () => {
    for (const email of ['', 'sin-arroba', 'a@b', 'a b@mail.com', `${'a'.repeat(190)}@mail.com`]) {
      expect(validateStockAlert({ ...base, email }, CATALOG)).toEqual({ ok: false, error: 'email' });
    }
  });

  it('rechaza un producto que no está en el catálogo', () => {
    expect(validateStockAlert({ ...base, slug: 'no-existe' }, CATALOG)).toEqual({ ok: false, error: 'producto' });
  });

  it('rechaza un talle que ese producto no tiene', () => {
    expect(validateStockAlert({ ...base, size: 'XXL' }, CATALOG)).toEqual({ ok: false, error: 'talle' });
  });
});

describe('uniqueEmails', () => {
  it('no repite a quien pidió más de un talle', () => {
    expect(uniqueEmails([{ email: 'a@mail.com' }, { email: 'b@mail.com' }, { email: 'a@mail.com' }]))
      .toEqual(['a@mail.com', 'b@mail.com']);
  });
});
