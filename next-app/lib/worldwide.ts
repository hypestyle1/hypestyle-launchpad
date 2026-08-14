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

/*
 * Las zonas son las mismas cuatro del tarifario de Boxfly (ver lib/shipping-intl),
 * y no una lista aparte: antes esta página prometía "Correo Argentino / OCA" para
 * Latinoamérica y otro transportista para Estados Unidos mientras el checkout cobraba
 * otra cosa. El precio exacto lo calcula el checkout según lo que haya en el
 * carrito, así que acá se habla de plazos y transportista, no de importes.
 */
export const SHIPPING_ZONES = [
  {
    region: 'América',
    countries: 'Estados Unidos, Canadá, México, Brasil, Chile, Uruguay, Colombia, Perú y más',
    time: '7–15 días hábiles',
    carrier: 'FedEx',
  },
  {
    region: 'Europa',
    countries: 'España, Italia, Francia, Alemania, Reino Unido, Portugal y más',
    time: '10–18 días hábiles',
    carrier: 'FedEx',
  },
  {
    region: 'Asia',
    countries: 'Japón, Corea del Sur, Singapur, Hong Kong, India, Emiratos Árabes e Israel',
    time: '12–20 días hábiles',
    carrier: 'FedEx',
  },
  {
    region: 'Oceanía',
    countries: 'Australia y Nueva Zelanda',
    time: '12–22 días hábiles',
    carrier: 'FedEx',
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
    a: 'Los impuestos de importación quedan a cargo de quien recibe, según la normativa de cada país. El precio del envío sí incluye el flete, el seguro por pérdida o daño y los impuestos de exportación de Argentina.',
  },
  {
    q: '¿Cuánto sale el envío?',
    a: 'Se calcula en el checkout según lo que lleves y a qué país va, y se paga junto con el pedido. El precio queda cerrado antes de pagar.',
  },
];
