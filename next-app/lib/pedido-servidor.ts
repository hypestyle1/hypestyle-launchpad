/**
 * Lado "con red" del cálculo de precios del pedido: trae el catálogo, el
 * estado de las promos, las tarifas de Andreani y el flag de envío gratis del
 * cupón, y se los pasa a las funciones puras de lib/precio-servidor.
 */
import { fetchAllProducts } from '@/lib/products-server';
import { getPromo3x2Status } from '@/lib/promo-3x2-status';
import { getPromoChampionStatus } from '@/lib/promo-champion-status';
import { getActiveDiscountStatus } from '@/lib/goal-discount';
import { GOAL_DISCOUNT_SLUG } from '@/hooks/useGoalDiscount';
import { cotizarAndreani } from '@/lib/andreani-cotizador';
import { cuponConEnvioGratis } from '@/lib/cupon-envio-gratis';
import {
  descuentos, envioNacional, lineasFisicas, preciosDeLineas, subtotal,
  type ItemPedido, type LineaPrecio, type ResultadoEnvio,
} from '@/lib/precio-servidor';

/** slug → precio que muestra la tienda. Incluye la gift card y el regalo, que
 *  la vitrina esconde pero existen en el catálogo. */
async function catalogoDePrecios(): Promise<{ precios: Map<string, number>; regularGol: number | null }> {
  const productos = await fetchAllProducts();
  const precios = new Map<string, number>();
  let regularGol: number | null = null;
  for (const p of productos) {
    if (p.slug && p.price > 0) precios.set(p.slug, p.price);
    if (p.slug === GOAL_DISCOUNT_SLUG) regularGol = p.originalPrice || p.price || null;
  }
  return { precios, regularGol };
}

async function precioGolActual(regular: number | null): Promise<number | null> {
  if (!regular) return null;
  const st = await getActiveDiscountStatus().catch(() => null);
  return st?.active && st.percent ? Math.round(regular * (1 - st.percent)) : null;
}

export type PedidoCalculado = {
  lineas: LineaPrecio[];
  descuento: { monto: number; etiqueta: string | undefined };
  envio: ResultadoEnvio;
  /** Para el log: diferencias entre lo que mandó el navegador y lo que se cobra. */
  diferencias: string[];
};

export async function calcularPedido(args: {
  items: ItemPedido[];
  metodo: string;
  internacional: boolean;
  /** Solo nacional: datos para recotizar el envío. */
  envio?: { cp: string; provincia: string; tarifaId?: string | null; costoCliente?: unknown; cupon?: string | null };
  /** Lo que el navegador dijo que descontaba, solo para dejar rastro si no coincide. */
  descuentoCliente?: unknown;
  /**
   * Precios que no están en el catálogo público: los productos privados de la
   * preventa (Private Access). Solo se pasan si el pedido viene con una sesión
   * válida de Mejores Amigos; sin eso un producto privado sigue "no disponible".
   * El catálogo público gana si un slug está en los dos.
   */
  preciosExtra?: Map<string, number>;
}): Promise<PedidoCalculado> {
  const { precios, regularGol } = await catalogoDePrecios();
  for (const [slug, precio] of args.preciosExtra ?? []) {
    if (!precios.has(slug) && precio > 0) precios.set(slug, precio);
  }
  const tieneGol = args.items.some((i) => i.id === GOAL_DISCOUNT_SLUG);
  const precioGol = tieneGol ? await precioGolActual(regularGol) : null;
  const lineas = preciosDeLineas(args.items, precios, { precioGol });

  const diferencias: string[] = [];
  for (const [i, it] of args.items.entries()) {
    const cliente = Math.round(Number(it.price));
    if (Number.isFinite(cliente) && cliente !== Math.round(lineas[i].price)) {
      diferencias.push(`${lineas[i].id}: navegador ${cliente}, servidor ${lineas[i].price}`);
    }
  }

  const [st3x2, stCampeon] = args.internacional
    ? [null, null]
    : await Promise.all([
        getPromo3x2Status().catch(() => null),
        getPromoChampionStatus().catch(() => null),
      ]);
  const descuento = descuentos(lineas, {
    metodo: args.metodo,
    internacional: args.internacional,
    campeonActivo: !!stCampeon?.promoActive,
    tresPorDosActivo: !!st3x2?.promoActive,
  });
  const dCliente = Math.round(Number(args.descuentoCliente) || 0);
  if (dCliente !== descuento.monto) diferencias.push(`descuento: navegador ${dCliente}, servidor ${descuento.monto}`);

  let envio: ResultadoEnvio = { verificado: true, costo: 0, tarifa: { id: '', label: '', cost: 0 } };
  if (!args.internacional && args.envio) {
    const subtotalFisico = subtotal(lineasFisicas(lineas));
    let tarifas = null;
    if (subtotalFisico > 0 && args.envio.cp) {
      const r = await cotizarAndreani({ cp: args.envio.cp, provincia: args.envio.provincia, valor: subtotal(lineas) }).catch(() => null);
      tarifas = r?.rates && r.rates.length > 0 ? r.rates : null;
    }
    envio = envioNacional({
      tarifas,
      tarifaId: args.envio.tarifaId,
      costoCliente: args.envio.costoCliente,
      subtotalFisico,
      cuponEnvioGratis: await cuponConEnvioGratis(args.envio.cupon),
    });
    const eCliente = Math.round(Number(args.envio.costoCliente) || 0);
    if (envio.verificado && eCliente !== envio.costo) diferencias.push(`envío: navegador ${eCliente}, servidor ${envio.costo}`);
  }

  return { lineas, descuento, envio, diferencias };
}
