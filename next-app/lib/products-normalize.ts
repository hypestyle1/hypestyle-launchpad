export interface NormalizedProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string;
  images: string[];
  href: string;
  sizes: string[];
  stock: Record<string, 'ok' | 'low' | 'out'>;
  tags: string[];
}

function parsePrice(s?: string | null): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'Única'];
function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a), bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

const WP_CAT: Record<string, string> = {
  remera:    'Tee',
  hoodie:    'Hoodie',
  short:     'Jort',
  musculosa: 'Top',
  accesorio: 'Accesorio',
  pantalon:  'Pantalón',
  set:       'Set',
  pack:      'Pack',
  campera:   'Campera',
  polo:      'Polo',
};

function stockStatus(status: string, qty: number | null): 'ok' | 'low' | 'out' {
  if (status === 'OUT_OF_STOCK') return 'out';
  if (qty !== null && qty <= 3) return 'low';
  return 'ok';
}

export function fromWPNode(node: any): NormalizedProduct {
  const regular  = parsePrice(node.regularPrice);
  const explicit = parsePrice(node.salePrice);
  const current  = parsePrice(node.price);
  const active   = explicit > 0 ? explicit : current;
  const price    = active > 0 ? active : regular;
  const originalPrice = (price > 0 && price < regular) ? regular : undefined;

  const images: string[] = [];
  if (node.image?.sourceUrl) images.push(node.image.sourceUrl);
  if (!images.length) images.push('');

  const sizes: string[] = [];
  const stock: Record<string, 'ok' | 'low' | 'out'> = {};
  const variations: any[] = node.variations?.nodes ?? [];

  if (variations.length) {
    for (const v of variations) {
      const sizeAttr = v.attributes?.nodes?.find((a: any) => {
        const n = (a.name || '').toLowerCase();
        return n === 'talle' || n === 'size' || n === 'pa_talle' || n === 'color' || n === 'pa_color';
      });
      const sz = sizeAttr?.value?.trim() || 'Única';
      if (!sizes.includes(sz)) {
        sizes.push(sz);
        stock[sz] = stockStatus(v.stockStatus, v.stockQuantity ?? null);
      }
    }
  } else {
    sizes.push('Única');
    stock['Única'] = stockStatus(node.stockStatus || 'IN_STOCK', node.stockQuantity ?? null);
  }

  const badge = originalPrice
    ? `−${Math.round((1 - price / originalPrice) * 100)}%`
    : undefined;

  return {
    id: node.slug,
    name: node.name,
    slug: node.slug,
    category: (() => {
      const slug = node.productCategories?.nodes?.[0]?.slug ?? '';
      return WP_CAT[slug] ?? node.productCategories?.nodes?.[0]?.name ?? '';
    })(),
    price,
    originalPrice,
    badge,
    image: images[0],
    images,
    href: `/producto/${node.slug}/`,
    sizes: sortSizes(sizes),
    stock,
    tags: (node.productTags?.nodes ?? []).map((t: any) => t.slug),
  };
}
