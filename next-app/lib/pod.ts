// Prendas print on demand: diseños que no se estampan hasta que alguien los
// compra. Cada uno sale de un blank (la prenda sin estampar) que se comparte
// con los demás diseños del mismo color y molde.
//
// Espejo de HS_STOCK_RECIPES del mu-plugin (PHP/hypestyle-api.php), acotado a
// los estampados POD: las Regular Tee y sus 3-PACK también salen de pilas
// compartidas, pero vienen ya hechas de fábrica y no hay nada que mandar a
// estampar. Cuando las pilas de blanks estén en producción (PHP 1.29.0) este
// mapa puede pasar a leerse del snapshot de /api/admin/shared-stock; hasta
// entonces vive acá para que la pantalla funcione sin esperar al backend.

export interface PodDesign {
  /** product_id del diseño en WooCommerce. */
  productId: number;
  name: string;
  /** Pila de blanks de la que sale, agrupada por color + molde. */
  blank: string;
  /** Retirado de la venta: no debería aparecer, pero puede haber cola vieja. */
  retirado?: boolean;
}

export const POD_DESIGNS: PodDesign[] = [
  // Remeras boxy.
  { productId: 1044, name: 'ONLY GOD CAN JUDGE ME — Blanca', blank: 'boxy_blanco' },
  { productId: 1045, name: 'ONLY GOD CAN JUDGE ME — Negra',  blank: 'boxy_negro' },
  { productId: 2029, name: 'CHRIST REIGNS TEE',              blank: 'boxy_gris_topo' },
  { productId: 2036, name: 'JESUS HEART TEE',                blank: 'boxy_crop_blanco' },
  // Hoodies negros: los tres salen del mismo buzo sin estampar.
  { productId: 2019, name: 'CHRIST REIGNS HOODIE',           blank: 'hoodie_negro' },
  { productId: 2271, name: 'Hoodie Black HStars',            blank: 'hoodie_negro' },
  { productId: 2351, name: 'SHOOT FOR THE STARS',            blank: 'hoodie_negro', retirado: true },
];

export const POD_BY_PRODUCT_ID: Record<number, PodDesign> = Object.fromEntries(
  POD_DESIGNS.map(d => [d.productId, d]),
);

/** Etiqueta legible de cada pila de blanks, para la UI. */
export const BLANK_LABEL: Record<string, string> = {
  boxy_blanco:      'Blank remera boxy blanco',
  boxy_negro:       'Blank remera boxy negro',
  boxy_gris_topo:   'Blank remera boxy gris topo',
  boxy_crop_blanco: 'Blank remera boxy crop blanco',
  hoodie_negro:     'Blank hoodie negro',
};

export const POD_SIZES = ['S', 'M', 'L', 'XL'] as const;

/** Talle desconocido: la línea del pedido quedó sin variación ni meta "Talle". */
export const SIN_TALLE = '—';

/** Orden de talles para las tablas; lo que no reconoce va al final. */
export function ordenTalle(talle: string): number {
  const i = (POD_SIZES as readonly string[]).indexOf(talle);
  return i === -1 ? POD_SIZES.length : i;
}

export interface PodLinea {
  productId: number;
  design: string;
  blank: string;
  talle: string;
  cantidad: number;
  /** Números de pedido que piden esa combinación diseño + talle. */
  pedidos: { id: number; number: string }[];
}

export interface PodBlank {
  blank: string;
  label: string;
  /** talle => unidades. Es lo que hay que tener del blank para cubrir la cola. */
  porTalle: Record<string, number>;
  total: number;
}

export interface PodPendiente {
  /** Pedidos 'processing' revisados. */
  revisados: number;
  /** De esos, los que están por empaquetar (sin rótulo ni guía). */
  porEmpaquetar: number;
  lineas: PodLinea[];
  blanks: PodBlank[];
  total: number;
  /** Prendas POD en la cola sin talle: no se pueden mandar a estampar así. */
  sinTalle: number;
}

/* ─── Armado de la cola ───────────────────────────────────────────────────
 * Vive acá y no en la ruta para poder testearlo sin salir a WooCommerce. */

/** Forma mínima de una orden de WC que necesita la cola. */
export interface PodOrderLike {
  id: number;
  number: string | number;
  meta_data?: { key?: string; value?: unknown }[];
  line_items?: { product_id: number; quantity: number; meta_data?: { key?: string; value?: unknown }[] }[];
}

// Mismo criterio que /api/admin/orders/counts: el rótulo de Andreani se genera
// al empaquetar y la guía aparece al despachar. Cualquiera de los dos significa
// que la prenda ya está hecha, así que sale de la cola sola.
const PACKAGED_KEYS = ['_order_andreani_pedido_id', '_order_andreani_numero_interno', '_andreani_tracking_number'];

function tieneMeta(meta: PodOrderLike['meta_data'], keys: string[]): boolean {
  return (meta || []).some(m => keys.includes(String(m.key)) && String(m.value ?? '').trim() !== '');
}

export function estaPorEmpaquetar(order: PodOrderLike): boolean {
  return !tieneMeta(order.meta_data, ['_tracking_number']) && !tieneMeta(order.meta_data, PACKAGED_KEYS);
}

/** Talle de una línea: la meta que deja la variación, o SIN_TALLE si no hay. */
export function talleDeLinea(li: { meta_data?: { key?: string; value?: unknown }[] }): string {
  const m = (li.meta_data || []).find(x =>
    ['talle', 'pa_talle', 'size', 'pa_size'].includes(String(x.key || '').toLowerCase()),
  );
  return String(m?.value ?? '').trim().toUpperCase() || SIN_TALLE;
}

/** Agrupa las prendas POD de las órdenes dadas por diseño + talle y por blank. */
export function armarCola(orders: PodOrderLike[]): Omit<PodPendiente, 'revisados' | 'porEmpaquetar'> {
  // diseño + talle es la unidad de trabajo: es lo que se manda a estampar.
  const acc = new Map<string, PodLinea>();
  for (const o of orders) {
    for (const li of (o.line_items || [])) {
      const design = POD_BY_PRODUCT_ID[li.product_id];
      if (!design) continue;
      const talle = talleDeLinea(li);
      const key = `${design.productId}|${talle}`;
      const linea = acc.get(key) || {
        productId: design.productId,
        design: design.name,
        blank: design.blank,
        talle,
        cantidad: 0,
        pedidos: [],
      };
      linea.cantidad += Number(li.quantity) || 0;
      // Un pedido con dos talles del mismo diseño ya son dos líneas distintas.
      if (!linea.pedidos.some(p => p.id === o.id)) linea.pedidos.push({ id: o.id, number: String(o.number) });
      acc.set(key, linea);
    }
  }

  const lineas = [...acc.values()].sort(
    (a, b) => a.blank.localeCompare(b.blank)
           || a.design.localeCompare(b.design)
           || ordenTalle(a.talle) - ordenTalle(b.talle),
  );

  // Lo mismo sumado por pila de blanks: es la cuenta que va al pedido semanal,
  // porque el blank sirve para cualquier diseño que salga de él.
  const porBlank = new Map<string, PodBlank>();
  for (const l of lineas) {
    const b = porBlank.get(l.blank) || { blank: l.blank, label: BLANK_LABEL[l.blank] || l.blank, porTalle: {}, total: 0 };
    b.porTalle[l.talle] = (b.porTalle[l.talle] || 0) + l.cantidad;
    b.total += l.cantidad;
    porBlank.set(l.blank, b);
  }

  return {
    lineas,
    blanks: [...porBlank.values()].sort((a, b) => b.total - a.total),
    total: lineas.reduce((s, l) => s + l.cantidad, 0),
    sinTalle: lineas.filter(l => l.talle === SIN_TALLE).reduce((s, l) => s + l.cantidad, 0),
  };
}
