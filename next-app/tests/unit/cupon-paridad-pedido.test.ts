import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { descuentoCupon, type LineaCupon } from '@/lib/cupon-lineas';

/**
 * PARIDAD de punta a punta: el descuento que el checkout muestra tiene que ser
 * EXACTAMENTE el que Woo le va a poner al pedido.
 *
 * woo() es una reimplementacion del algoritmo del core (WC 11.2.1:
 * WC_Coupon::is_valid_for_product + WC_Discounts::get_items_to_apply_coupon +
 * apply_coupon_percent), escrita a partir del fuente y NO de nuestro codigo: es
 * la referencia contra la que se compara, no el mismo calculo dos veces.
 *
 * Lo que mira linea por linea:
 *   - is_valid_for_product es false si el id del producto O el del padre esta
 *     en excluded_product_ids;
 *   - el item se descarta solo si ! is_valid_for_product && ! is_valid_for_cart,
 *     y is_valid_for_cart es true unicamente para fixed_cart;
 *   - el descuento es floor(subtotal_en_centavos x %) POR LINEA.
 */
type LineaWoo = { slug: string; productId: number; parentId?: number; price: number; quantity: number };

function woo(lineas: LineaWoo[], opts: { amount: number; excluded: number[]; fixedCart?: boolean }): number {
  let centavos = 0;
  for (const l of lineas) {
    const ids = [l.productId, l.parentId ?? 0].filter((i) => i > 0);
    const validForProduct = !ids.some((id) => opts.excluded.includes(id));
    const validForCart = opts.fixedCart === true;
    if (!validForProduct && !validForCart) continue;
    centavos += Math.floor((Math.round(l.price * l.quantity * 100) * opts.amount) / 100);
  }
  return centavos / 100;
}

/** Lo que devuelve /validate-coupon: el slug se resuelve al id del PRODUCTO. */
function elegibilidadDelBackend(lineas: LineaWoo[], excluded: number[]) {
  return lineas.map((l) => {
    const pid = l.parentId && l.parentId > 0 ? l.parentId : l.productId;
    return { id: l.slug, product_id: pid, eligible: !excluded.includes(pid) };
  });
}

function aLineasCupon(lineas: LineaWoo[]): LineaCupon[] {
  return lineas.map((l) => ({ id: l.slug, price: l.price, quantity: l.quantity }));
}

// Exclusiones vivas de HYPE10 el 28/10/2026 (wc/v3/coupons?code=hype10).
const EXCL = [415, 425, 436, 444, 2337, 2653, 2659, 2664, 337, 358, 1606, 2328];

const CARRITOS: { nombre: string; lineas: LineaWoo[] }[] = [
  {
    nombre: 'pedido #4048 - una sola linea, producto excluido (436)',
    lineas: [{ slug: 'regular-tee-black', productId: 436, parentId: 0, price: 66300, quantity: 1 }],
  },
  {
    nombre: 'pedido #4048 real - la linea es una VARIACION (439) del padre excluido',
    lineas: [{ slug: 'regular-tee-black', productId: 439, parentId: 436, price: 66300, quantity: 1 }],
  },
  {
    nombre: 'pedido #4025 - variacion 2656 del padre 2653, excluido',
    lineas: [{ slug: 'regular-tee-melange', productId: 2656, parentId: 2653, price: 59160, quantity: 1 }],
  },
  {
    nombre: 'carrito mixto - un Regular excluido y un hoodie elegible',
    lineas: [
      { slug: 'regular-tee-black', productId: 439, parentId: 436, price: 28900, quantity: 1 },
      { slug: 'hoodie-ss27', productId: 5001, parentId: 5000, price: 110000, quantity: 1 },
    ],
  },
  {
    nombre: 'cantidades - 3 unidades de un elegible y 2 de un excluido',
    lineas: [
      { slug: 'hoodie-ss27', productId: 5001, parentId: 5000, price: 110000, quantity: 3 },
      { slug: 'regular-tee-white', productId: 426, parentId: 425, price: 28900, quantity: 2 },
    ],
  },
  {
    nombre: 'pack de 3 Regular individuales - los tres excluidos',
    lineas: [
      { slug: 'regular-tee-black', productId: 439, parentId: 436, price: 28900, quantity: 1 },
      { slug: 'regular-tee-white', productId: 426, parentId: 425, price: 28900, quantity: 1 },
      { slug: 'regular-tee-melange', productId: 2656, parentId: 2653, price: 28900, quantity: 1 },
    ],
  },
  {
    nombre: 'pack de 4 de la ventana - 3 excluidos y uno elegible',
    lineas: [
      { slug: 'regular-tee-black', productId: 439, parentId: 436, price: 28900, quantity: 3 },
      { slug: 'tee-art-randal', productId: 833, parentId: 832, price: 28900, quantity: 1 },
    ],
  },
  {
    nombre: 'gift card - producto simple sin padre, elegible',
    lineas: [{ slug: 'gift-card', productId: 9100, price: 50000, quantity: 1 }],
  },
  {
    nombre: 'precios con centavos - el floor por linea tiene que coincidir',
    lineas: [
      { slug: 'medias-pack', productId: 7001, price: 1.11, quantity: 1 },
      { slug: 'gorra', productId: 7002, price: 33.33, quantity: 3 },
      { slug: 'regular-tee-black', productId: 439, parentId: 436, price: 9.99, quantity: 1 },
    ],
  },
  {
    nombre: 'carrito grande - 6 lineas, mezcla de todo',
    lineas: [
      { slug: 'hoodie-ss27', productId: 5001, parentId: 5000, price: 110000, quantity: 1 },
      { slug: 'regular-tee-black', productId: 439, parentId: 436, price: 28900, quantity: 2 },
      { slug: 'buzo-faith', productId: 6001, parentId: 6000, price: 95000, quantity: 1 },
      { slug: 'regular-tee-brown', productId: 2660, parentId: 2659, price: 28900, quantity: 1 },
      { slug: 'gift-card', productId: 9100, price: 20000, quantity: 1 },
      { slug: 'gorra-camo', productId: 7003, price: 24000, quantity: 2 },
    ],
  },
];

describe('paridad checkout <-> Woo - HYPE10 al 10%', () => {
  for (const c of CARRITOS) {
    it(c.nombre, () => {
      const esperado = woo(c.lineas, { amount: 10, excluded: EXCL });
      const mostrado = descuentoCupon(aLineasCupon(c.lineas), {
        type: 'percent',
        amount: 10,
        items: elegibilidadDelBackend(c.lineas, EXCL),
      });
      expect(mostrado).toBe(esperado);
    });
  }

  it('un cupon de carrito (fixed_cart) descuenta sobre todo, exclusiones incluidas', () => {
    const lineas = CARRITOS[3].lineas;
    const sub = lineas.reduce((s, l) => s + l.price * l.quantity, 0);
    expect(descuentoCupon(aLineasCupon(lineas), { type: 'fixed', amount: 5000 })).toBe(Math.min(5000, sub));
  });

  it('con otro porcentaje (20%) la paridad se mantiene', () => {
    for (const c of CARRITOS) {
      const esperado = woo(c.lineas, { amount: 20, excluded: EXCL });
      const mostrado = descuentoCupon(aLineasCupon(c.lineas), {
        type: 'percent',
        amount: 20,
        items: elegibilidadDelBackend(c.lineas, EXCL),
      });
      expect(mostrado, c.nombre).toBe(esperado);
    }
  });
});

/* --- La ruta: el carrito viaja al PHP y la elegibilidad vuelve --- */
vi.mock('@/lib/cupon-envio-gratis', () => ({ cuponConEnvioGratis: async () => false }));

let enviadoAlPhp: any = null;

beforeEach(() => {
  enviadoAlPhp = null;
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: any) => {
    if (String(url).includes('/hypestyle/v1/validate-coupon')) {
      enviadoAlPhp = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          valid: true, code: 'HYPE10', type: 'percent', amount: 10, product_coupon: true,
          excluded_ids: EXCL,
          items: [
            { id: 'regular-tee-black', product_id: 436, eligible: false },
            { id: 'hoodie-ss27', product_id: 5000, eligible: true },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function pedir(body: unknown) {
  return new NextRequest('http://localhost/api/validate-coupon', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/validate-coupon - contrato con el PHP', () => {
  it('manda los items del carrito y devuelve la elegibilidad por linea', async () => {
    const { POST } = await import('@/app/api/validate-coupon/route');
    const res = await POST(pedir({
      code: 'hype10', total: 139000, email: 'nueva@gmail.com',
      items: [
        { id: 'regular-tee-black', quantity: 1 },
        { id: 'hoodie-ss27', quantity: 1 },
      ],
    }));
    const data = await res.json();
    expect(enviadoAlPhp.items).toEqual([
      { id: 'regular-tee-black', qty: 1 },
      { id: 'hoodie-ss27', qty: 1 },
    ]);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].eligible).toBe(false);
  });

  it('sin items no manda el bloque: un backend viejo sigue respondiendo igual', async () => {
    const { POST } = await import('@/app/api/validate-coupon/route');
    await POST(pedir({ code: 'hype10', total: 139000, email: 'nueva@gmail.com' }));
    expect(enviadoAlPhp.items).toBeUndefined();
  });

  it('normaliza cantidades basura del navegador en vez de reenviarlas', async () => {
    const { POST } = await import('@/app/api/validate-coupon/route');
    await POST(pedir({
      code: 'hype10', total: 1, email: 'x@gmail.com',
      items: [{ id: 'hoodie-ss27', quantity: -5 }, { id: '', quantity: 2 }, { id: 'gorra', quantity: 'tres' }],
    }));
    expect(enviadoAlPhp.items).toEqual([{ id: 'hoodie-ss27', qty: 1 }, { id: 'gorra', qty: 1 }]);
  });
});
