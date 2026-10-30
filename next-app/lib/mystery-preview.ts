import { type Product } from '@/data/products';
import { MYSTERY_CAJAS, mockupPool, type MysteryCaja } from '@/lib/mystery';

/**
 * Producto Mystery de mentira, **solo para desarrollo**.
 *
 * Las tres cajas todavía no existen en WooCommerce: el esquema se aprueba
 * antes de crearlas (ver el PRD). Sin esto la ficha no se puede ver ni revisar
 * hasta después de haber escrito en Woo, que es justo el orden que no
 * queremos. Con esto se diseña y se aprueba primero, y se crea después.
 *
 * El candado: `mysteryPreview()` devuelve undefined si
 * `process.env.NODE_ENV === 'production'`. Cuando los productos existan de
 * verdad, Woo gana sin tocar nada —el mock solo actúa si el slug NO vino de
 * Woo— y este archivo se borra.
 *
 * Los stocks por talle son los **cajas máximas** calculados contra el stock
 * real del 29/10 (pool ÷ prendas por caja), así el selector de talle del
 * preview se comporta como se va a comportar en serio.
 */

/** Cajas armables por talle = stock del pool por talle ÷ prendas por caja. */
const CAJAS_POR_TALLE: Record<string, Record<string, number>> = {
  'mystery-tees': { S: 49, M: 41, L: 41, XL: 49 },
  'mystery-longsleeves': { S: 23, M: 28, L: 26, XL: 29 },
  'mystery-hoodies': { S: 16, M: 14, L: 13, XL: 20 },
};

function galeria(caja: MysteryCaja): string[] {
  return [
    `/mystery/portadas/${caja.id}-a.webp`,
    `/mystery/portadas/${caja.id}-b.webp`,
    // Un par de prendas del pool como tercera y cuarta foto: muestran el
    // detalle de la estampa, que la portada a 2000px no deja ver.
    ...caja.modelos.slice(0, 4).map(m => mockupPool(m.id)),
  ];
}

export function mysteryPreview(slug: string): Product | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  const caja = MYSTERY_CAJAS.find(c => c.slug === slug);
  if (!caja) return undefined;

  const cajas = CAJAS_POR_TALLE[caja.slug];
  const sizes = ['S', 'M', 'L', 'XL'];
  const stock = Object.fromEntries(
    sizes.map(s => [s, cajas[s] === 0 ? 'out' : cajas[s] <= 5 ? 'low' : 'ok'])
  ) as Record<string, 'ok' | 'low' | 'out'>;

  return {
    slug: caja.slug,
    id: caja.slug,
    name: caja.nombre,
    category: 'Mystery',
    price: caja.precio,
    description: `${caja.garantia} ${caja.queEs}`,
    careItems: [
      { icon: 'wash', text: 'Lavar a mano o a máquina en agua fría (máx. 30°C)' },
      { icon: 'no-dryer', text: 'No usar secadora' },
      { icon: 'iron-low', text: 'Planchar a temperatura baja, sin vapor' },
      { icon: 'no-dry', text: 'No lavar en seco' },
    ],
    fit: 'Oversize',
    sizes,
    stock,
    // Una sola "colorway": la caja no tiene variantes de color, pero la ficha
    // asume siempre al menos una (ProductoClient lee colors[0].label).
    colors: [{ label: caja.nombre, value: '#0a0a0a', image: `/mystery/portadas/${caja.id}-a.webp`, slug: caja.slug }],
    images: galeria(caja),
  };
}
