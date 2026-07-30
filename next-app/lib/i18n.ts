import { Language } from '@/context/LocaleContext';

// Traducción liviana de la INTERFAZ (no del catálogo). La clave es el texto en
// español (idioma base); cada idioma agrega su columna. Si falta la traducción,
// cae al español. Por ahora solo está EN; PT/DE/FR/IT se completan en la fase
// grande de i18n (next-intl + URLs). Ver [[project_i18n_plan]].
type Dict = Record<string, Partial<Record<Exclude<Language, 'ES'>, string>>>;

const DICT: Dict = {
  // — Navbar —
  'Colecciones': { EN: 'Collections' },
  'Básicos': { EN: 'Basics' },
  'Políticas': { EN: 'Policies' },
  'Quiénes Somos': { EN: 'About Us' },
  'Contacto': { EN: 'Contact' },
  'Ver todo': { EN: 'View all' },
  'Ver más': { EN: 'View more' },
  'Ver todos los productos': { EN: 'View all products' },
  'Explorar': { EN: 'Explore' },
  'Categorías': { EN: 'Categories' },
  'Colección': { EN: 'Collection' },
  'Ver colección →': { EN: 'View collection →' },
  'Ver todo en': { EN: 'View all in' },
  'Arriba': { EN: 'Tops' },
  'Abajo': { EN: 'Bottoms' },
  'Accesorios': { EN: 'Accessories' },
  'Remeras': { EN: 'Tees' },
  'Pantalones': { EN: 'Pants' },
  'Gorras': { EN: 'Caps' },
  'Buscar productos...': { EN: 'Search products...' },
  'Sin resultados para': { EN: 'No results for' },

  // — ProductCard —
  'Agregar': { EN: 'Add' },
  'Sin stock': { EN: 'Out of stock' },
  '✓ agregado': { EN: '✓ added' },
  'Personalizable': { EN: 'Customizable' },

  // — CartDrawer —
  'Carrito': { EN: 'Cart' },
  '¡Conseguiste envío gratis!': { EN: 'You unlocked free shipping!' },
  'Añadí': { EN: 'Add' },
  'y conseguí': { EN: 'and get' },
  'envío gratis': { EN: 'free shipping' },
  'Tu carrito está vacío': { EN: 'Your cart is empty' },
  'Seguir comprando': { EN: 'Continue shopping' },
  'Talle': { EN: 'Size' },
  'Dorsal': { EN: 'Custom' },
  'Eliminar': { EN: 'Remove' },
  'Completa el look': { EN: 'Complete the look' },
  'Subtotal': { EN: 'Subtotal' },
  'Envío gratis aplicado': { EN: 'Free shipping applied' },
  'Envío calculado en el checkout': { EN: 'Shipping calculated at checkout' },
  'Iniciar compra': { EN: 'Checkout' },

  // — AnnouncementBar —
  'Envío gratis desde $250.000': { EN: 'Free shipping over $250.000' },
  'Hasta 3 cuotas sin interés': { EN: 'Up to 3 interest-free installments' },
  'Worldwide Shipping vía DHL': { EN: 'Worldwide shipping via DHL' },
  '30 días para cambios y devoluciones': { EN: '30 days for exchanges & returns' },

  // — Footer —
  'Sets': {},
  'Envíos internacionales': { EN: 'International shipping' },
  'Devoluciones': { EN: 'Returns' },
  'RRSS': { EN: 'Social' },
  'Suscribite y obtené un 10% de descuento': { EN: 'Subscribe and get 10% off' },
  '*No es acumulable con otras promociones': { EN: '*Not combinable with other promotions' },
  '✓ ¡Listo! Ya sos parte del círculo.': { EN: "✓ Done! You're part of the circle." },
  'Streetwear desde Buenos Aires. Drops limitados.': { EN: 'Streetwear from Buenos Aires. Limited drops.' },
  'Envíos a todo el mundo.': { EN: 'Worldwide shipping.' },
};

export function translate(text: string, lang: Language): string {
  if (lang === 'ES') return text;
  return DICT[text]?.[lang] ?? text;
}
