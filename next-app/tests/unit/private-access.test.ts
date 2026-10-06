import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, isPrivateAccessActive, isPublicOpen, isValidHandle, normalizeHandle, fmtDayMonth } from '@/lib/private-access/config';

describe('private-access · normalización del usuario de IG', () => {
  it('saca el @, pasa a minúsculas y recorta espacios y puntos finales', () => {
    expect(normalizeHandle(' @ValentinPozzi ')).toBe('valentinpozzi');
    expect(normalizeHandle('@@Fulano.')).toBe('fulano');
    expect(normalizeHandle('fulano')).toBe('fulano');
    expect(normalizeHandle('instagram.com/Hypestyle?hl=es')).toBe('hypestyle');
  });
  it('valida el formato de Instagram', () => {
    expect(isValidHandle('valentin.pozzi_03')).toBe(true);
    expect(isValidHandle('')).toBe(false);
    expect(isValidHandle('con espacio')).toBe(false);
    expect(isValidHandle('a'.repeat(31))).toBe(false);
  });
});

describe('private-access · ventana de preventa', () => {
  const cfg = { ...DEFAULT_CONFIG, enabled: true };
  const at = (iso: string) => new Date(iso).getTime();

  it('el default viene apagado (fail-closed si WordPress no responde)', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(false);
    expect(isPrivateAccessActive(DEFAULT_CONFIG, at('2026-10-06T12:00:00-03:00'))).toBe(false);
  });
  it('antes del inicio no está activa', () => {
    expect(isPrivateAccessActive(cfg, at('2026-10-03T12:00:00-03:00'))).toBe(false);
  });
  it('dentro de la ventana está activa', () => {
    expect(isPrivateAccessActive(cfg, at('2026-10-04T00:00:01-03:00'))).toBe(true);
    expect(isPrivateAccessActive(cfg, at('2026-10-10T23:59:00-03:00'))).toBe(true);
  });
  it('desde la apertura pública deja de estar activa y isPublicOpen pasa a true', () => {
    const t = at('2026-10-11T00:00:00-03:00');
    expect(isPrivateAccessActive(cfg, t)).toBe(false);
    expect(isPublicOpen(cfg, t)).toBe(true);
  });
  it('el override manual manda sobre la fecha', () => {
    expect(isPrivateAccessActive({ ...cfg, override: 'force_off' }, at('2026-10-06T12:00:00-03:00'))).toBe(false);
    expect(isPrivateAccessActive({ ...cfg, override: 'force_on' }, at('2026-09-01T12:00:00-03:00'))).toBe(true);
    expect(isPublicOpen({ ...cfg, override: 'force_on' }, at('2026-10-12T00:00:00-03:00'))).toBe(false);
  });
  it('formatea día.mes en hora Argentina', () => {
    expect(fmtDayMonth('2026-10-10T23:59:59-03:00')).toBe('10.10');
    expect(fmtDayMonth('2026-10-11T00:00:00-03:00')).toBe('11.10');
  });
});

describe('private-access · sesión firmada', () => {
  let session: typeof import('@/lib/private-access/session');

  beforeAll(async () => {
    vi.stubEnv('PRIVATE_ACCESS_SESSION_SECRET', 'secreto-de-prueba-no-usar');
    vi.resetModules();
    session = await import('@/lib/private-access/session');
  });

  it('vence en la apertura pública, con tope de 7 días', () => {
    const open = DEFAULT_CONFIG.publicOpenAt;
    expect(session.sessionExpiry(open, at('2026-10-09T12:00:00-03:00'))).toBe(at(open));
    expect(session.sessionExpiry(open, at('2026-10-01T12:00:00-03:00'))).toBe(at('2026-10-08T12:00:00-03:00'));
  });
  it('firma y verifica un token', async () => {
    const now = at('2026-10-05T12:00:00-03:00');
    const exp = session.sessionExpiry(DEFAULT_CONFIG.publicOpenAt, now);
    const token = await session.createSessionToken(42, exp);
    const parsed = await session.verifySessionToken(token, now);
    expect(parsed?.memberId).toBe(42);
    expect(parsed?.exp).toBe(at(DEFAULT_CONFIG.publicOpenAt));
  });
  it('rechaza un token manipulado o vencido', async () => {
    const now = at('2026-10-05T12:00:00-03:00');
    const token = await session.createSessionToken(42, session.sessionExpiry(DEFAULT_CONFIG.publicOpenAt, now));
    const [id, exp, sig] = token.split('.');
    expect(await session.verifySessionToken(`${Number(id) + 1}.${exp}.${sig}`, now)).toBeNull();
    expect(await session.verifySessionToken(`${id}.${Number(exp) + 1000}.${sig}`, now)).toBeNull();
    expect(await session.verifySessionToken(token, at('2026-10-12T00:00:00-03:00'))).toBeNull();
    expect(await session.verifySessionToken('basura', now)).toBeNull();
  });
});

function at(iso: string) { return new Date(iso).getTime(); }

describe('private-access · pedido (create-order-gocuotas)', () => {
  let order: typeof import('@/lib/private-access/order');
  let precio: typeof import('@/lib/precio-servidor');

  beforeAll(async () => {
    vi.stubEnv('PRIVATE_ACCESS_SESSION_SECRET', 'secreto-de-prueba-no-usar');
    vi.resetModules();
    order = await import('@/lib/private-access/order');
    precio = await import('@/lib/precio-servidor');
  });

  it('sin cookie no hay contexto de preventa (ni precios privados ni marca)', async () => {
    expect(await order.privateAccessForOrder(undefined)).toBeNull();
    expect(await order.privateAccessForOrder('999.9999999999999.firmafalsa')).toBeNull();
    expect(order.privateAccessMeta(null)).toBeNull();
  });
  it('un producto privado sin precio extra se rechaza (no se puede comprar armando la request)', () => {
    const publico = new Map([['hoodie-black-hstars', 89000]]);
    expect(() => precio.preciosDeLineas([{ id: 'athletic-dept-longsleeve-pink', quantity: 1 }], publico)).toThrow(/no está disponible/);
  });
  it('con los precios de la preventa se tasa al precio del servidor, no al del navegador', () => {
    const conPreventa = new Map([['hoodie-black-hstars', 89000], ['athletic-dept-longsleeve-pink', 49600]]);
    const lineas = precio.preciosDeLineas([{ id: 'athletic-dept-longsleeve-pink', quantity: 2, price: 1 }], conPreventa);
    expect(lineas).toEqual([{ id: 'athletic-dept-longsleeve-pink', price: 49600, quantity: 2 }]);
  });
  it('la marca del pedido lleva el memberId y la colección', () => {
    const m = order.privateAccessMeta({ memberId: 7, collection: 'ss27-part-01', precios: new Map() });
    expect(m).toEqual({ key: '_hs_private_access', value: JSON.stringify({ memberId: 7, collection: 'ss27-part-01' }) });
  });
});

describe('private-access · returnTo y modo mock', () => {
  it('returnTo solo acepta fichas privadas', async () => {
    const { safeReturnTo, gateUrlFor } = await import('@/lib/private-access/config');
    expect(safeReturnTo('/private-access/ss27-tee')).toBe('/private-access/ss27-tee');
    expect(safeReturnTo('/private-access/ss27-tee/')).toBe('/private-access/ss27-tee');
    expect(safeReturnTo('https://evil.com')).toBeNull();
    expect(safeReturnTo('//evil.com/private-access/x')).toBeNull();
    expect(safeReturnTo('/checkout')).toBeNull();
    expect(safeReturnTo('/private-access/../admin')).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
    expect(gateUrlFor('ss27-tee')).toBe('/private-access?returnTo=%2Fprivate-access%2Fss27-tee');
    expect(gateUrlFor('MAL slug!')).toBe('/private-access');
  });
  it('el modo mock nunca se prende en el deploy de producción', async () => {
    vi.stubEnv('PRIVATE_ACCESS_MOCK', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    const { isMockMode } = await import('@/lib/private-access/config');
    expect(isMockMode()).toBe(false);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(isMockMode()).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('precios crudos del mu-plugin', () => {
  // Formato real de /private-access/products: get_price() de Woo, con decimales.
  const node = {
    id: 'pa-3482', databaseId: 3482, name: 'HYPE – DISTRESSED GREY HOODIE', slug: 'hype-distressed-grey-hoodie',
    status: 'private', price: '78400.00', regularPrice: '98000.00', salePrice: '78400.00',
    stockStatus: 'IN_STOCK', stockQuantity: null,
    image: { sourceUrl: 'https://x/m.png' }, galleryImages: { nodes: [] },
    productCategories: { nodes: [{ name: 'Hoodie', slug: 'hoodie' }] }, productTags: { nodes: [] },
    variations: { nodes: [{ price: '78400.00', regularPrice: '98000.00', salePrice: '78400.00', stockStatus: 'IN_STOCK', stockQuantity: 3, attributes: { nodes: [{ name: 'pa_talle', value: 'M' }] } }] },
  };

  it('"98000.00" es $98.000, no $9.800.000', async () => {
    const { fromPrivateNode } = await import('@/lib/private-access/normalize');
    const p = fromPrivateNode(node, { saleEndsLabel: '10.10', publicOpenLabel: '11.10' });
    expect(p.price).toBe(78400);
    expect(p.originalPrice).toBe(98000);
  });

  it('la ficha también', async () => {
    const { withPlainPrices } = await import('@/lib/private-access/normalize');
    const { normalizeProductDetail } = await import('@/lib/product-detail');
    const d: any = normalizeProductDetail(withPlainPrices(node));
    expect(d.price).toBe(78400);
    expect(d.originalPrice).toBe(98000);
  });

  it('no toca precios que ya vienen formateados', async () => {
    const { withPlainPrices } = await import('@/lib/private-access/normalize');
    expect(withPlainPrices({ price: '$78.400' }).price).toBe('$78.400');
  });
});

describe('nombres con entidades del mu-plugin', () => {
  it('decodifica &amp; y las comillas tipográficas que guarda WordPress', async () => {
    const { decodeEntities } = await import('@/lib/private-access/normalize');
    expect(decodeEntities('STYLE&amp;CULTURE UNIVERSITY &#8211; WHITE TEE')).toBe('STYLE&CULTURE UNIVERSITY – WHITE TEE');
    expect(decodeEntities('RACE TEE &#038; GREY')).toBe('RACE TEE & GREY');
    expect(decodeEntities('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
    expect(decodeEntities('ЗОЛОТЫЕ КУПОЛА – HOODIE')).toBe('ЗОЛОТЫЕ КУПОЛА – HOODIE');
  });
  it('la card de la colección muestra el nombre decodificado', async () => {
    const { fromPrivateNode } = await import('@/lib/private-access/normalize');
    const p = fromPrivateNode({ name: 'STYLE&amp;CULTURE UNIVERSITY – BLACK TEE', slug: 'style-culture-university-black-tee', price: '31200.00', regularPrice: '39000.00', salePrice: '31200.00', image: { sourceUrl: '' } }, { saleEndsLabel: '10.10', publicOpenLabel: '11.10' });
    expect(p.name).toBe('STYLE&CULTURE UNIVERSITY – BLACK TEE');
  });
});

describe('colorways SS27', () => {
  it('cada producto del drop con más de un color ve a sus hermanos', async () => {
    const { getColorwaysForSlug } = await import('@/lib/product-detail');
    const grupos: Record<string, number> = {
      'athletic-dept-white-tee': 3, 'athletic-dept-white-grey-print-tee': 3, 'athletic-dept-navy-tee': 3,
      'worn-varsity-club-white-tee': 2, 'worn-varsity-club-navy-tee': 2,
      'h-hype-white-tee': 2, 'h-hype-navy-tee': 2,
      'style-culture-university-white-tee': 3, 'style-culture-university-black-tee': 3, 'style-culture-university-navy-tee': 3,
      'athletic-dept-pink-longsleeve': 2, 'athletic-dept-blue-longsleeve': 2,
    };
    for (const [slug, n] of Object.entries(grupos)) {
      const g = getColorwaysForSlug(slug);
      expect(g?.length, slug).toBe(n);
      expect(g?.some(c => c.slug === slug), slug).toBe(true);
    }
  });
});

describe('Próximamente (tag proximamente)', () => {
  const node = (tags: string[]) => ({
    name: 'HYPE CREATIVE GOODS – PINK RAGLAN LONGSLEEVE', slug: 'hype-creative-goods-pink-raglan-longsleeve',
    price: '48000.00', regularPrice: '60000.00', salePrice: '48000.00', image: { sourceUrl: '' },
    productTags: { nodes: tags.map(slug => ({ slug, name: slug })) },
  });

  it('marca comingSoon y la card queda solo vidriera', async () => {
    const { fromPrivateNode } = await import('@/lib/private-access/normalize');
    const { toRetailCardProps } = await import('@/lib/private-access/retail');
    const p = fromPrivateNode(node(['ss27-part-01', 'proximamente']), { saleEndsLabel: '10.10', publicOpenLabel: '11.10' });
    expect(p.comingSoon).toBe(true);
    expect(toRetailCardProps(p)).toMatchObject({ badge: 'Próximamente', disableLink: true, price: 60000, originalPrice: undefined });
  });

  it('sin el tag se vende como siempre', async () => {
    const { fromPrivateNode } = await import('@/lib/private-access/normalize');
    const { toRetailCardProps } = await import('@/lib/private-access/retail');
    const p = fromPrivateNode(node(['ss27-part-01']), { saleEndsLabel: '10.10', publicOpenLabel: '11.10' });
    expect(p.comingSoon).toBe(false);
    expect(toRetailCardProps(p)).not.toHaveProperty('disableLink');
  });
});
