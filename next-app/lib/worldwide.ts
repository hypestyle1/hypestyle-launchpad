/**
 * Zonas y preguntas frecuentes de envío internacional.
 *
 * Vive acá (y no dentro de la página) porque el wrapper server de /worldwide
 * necesita las FAQ para emitir el structured data, y la página es un client
 * component. Mismo criterio que lib/category-config.ts.
 *
 * Los textos están en español porque son las claves del diccionario de
 * lib/i18n.ts: la página los pasa por t() para mostrarlos en el idioma activo.
 */

export const SHIPPING_ZONES = [
  {
    region: 'América Latina',
    countries: 'Argentina, Chile, Uruguay, Paraguay, Bolivia, Perú, Colombia, México',
    time: '7–15 días hábiles',
    carrier: 'Correo Argentino / OCA',
  },
  {
    region: 'Estados Unidos & Canadá',
    countries: 'USA, Canada',
    time: '10–20 días hábiles',
    carrier: 'DHL / FedEx',
  },
  {
    region: 'Europa',
    countries: 'España, Italia, Francia, Alemania, Reino Unido y más',
    time: '12–22 días hábiles',
    carrier: 'DHL / Correo Internacional',
  },
  {
    region: 'Resto del mundo',
    countries: 'Consultar disponibilidad',
    time: 'Variable',
    carrier: 'A coordinar',
  },
];

export const SHIPPING_FAQS = [
  {
    q: '¿Cuándo se despacha mi pedido?',
    a: 'Los pedidos se despachan dentro de los 2–3 días hábiles posteriores a la confirmación del pago.',
  },
  {
    q: '¿Puedo rastrear mi envío?',
    a: 'Sí. Una vez despachado, te enviamos el número de seguimiento por WhatsApp o email.',
  },
  {
    q: '¿Qué pasa si hay demoras en aduana?',
    a: 'Los tiempos de aduana son ajenos a Hypestyle. En caso de demoras, te acompañamos en el seguimiento.',
  },
  {
    q: '¿Los aranceles de importación están incluidos?',
    a: 'No. Los impuestos de importación son responsabilidad del comprador según la normativa de cada país.',
  },
];
