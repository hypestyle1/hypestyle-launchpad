import { Language } from '@/context/LocaleContext';

// Traducción liviana de la INTERFAZ (no del catálogo: los nombres y las
// descripciones de producto siguen viniendo de WooCommerce en español). La
// clave es el texto en español (idioma base); cada idioma agrega su columna.
// Si falta la traducción, cae al español.
//
// Idiomas soportados: los de LANGUAGES en LocaleContext (ES/EN/PT). El Footer
// llegó a ofrecer DE/FR/IT, que no existían en el tipo Language ni acá — se
// veían en el selector y no hacían nada. Si se suma un idioma, va en LANGUAGES
// y con su columna completa acá, no solo en el selector.
type Dict = Record<string, Partial<Record<Exclude<Language, 'ES'>, string>>>;

const DICT: Dict = {
  // — Navbar —
  'Colecciones': { EN: 'Collections', PT: 'Coleções' },
  'Básicos': { EN: 'Basics', PT: 'Básicos' },
  'Políticas': { EN: 'Policies', PT: 'Políticas' },
  'Quiénes Somos': { EN: 'About Us', PT: 'Sobre Nós' },
  'Contacto': { EN: 'Contact', PT: 'Contato' },
  'Ver todo': { EN: 'View all', PT: 'Ver tudo' },
  'Ver más': { EN: 'View more', PT: 'Ver mais' },
  'Ver todos los productos': { EN: 'View all products', PT: 'Ver todos os produtos' },
  'Explorar': { EN: 'Explore', PT: 'Explorar' },
  'Categorías': { EN: 'Categories', PT: 'Categorias' },
  'Colección': { EN: 'Collection', PT: 'Coleção' },
  'Ver colección →': { EN: 'View collection →', PT: 'Ver coleção →' },
  'Ver todo en': { EN: 'View all in', PT: 'Ver tudo em' },
  'Arriba': { EN: 'Tops', PT: 'Parte de cima' },
  'Abajo': { EN: 'Bottoms', PT: 'Parte de baixo' },
  'Accesorios': { EN: 'Accessories', PT: 'Acessórios' },
  'Remeras': { EN: 'Tees', PT: 'Camisetas' },
  'Pantalones': { EN: 'Pants', PT: 'Calças' },
  'Gorras': { EN: 'Caps', PT: 'Bonés' },
  'Buscar productos...': { EN: 'Search products...', PT: 'Buscar produtos...' },
  'Sin resultados para': { EN: 'No results for', PT: 'Sem resultados para' },

  // — ProductCard —
  'Agregar': { EN: 'Add', PT: 'Adicionar' },
  'Sin stock': { EN: 'Out of stock', PT: 'Esgotado' },
  '✓ agregado': { EN: '✓ added', PT: '✓ adicionado' },
  'Personalizable': { EN: 'Customizable', PT: 'Personalizável' },

  // — CartDrawer —
  'Carrito': { EN: 'Cart', PT: 'Carrinho' },
  '¡Conseguiste envío gratis!': { EN: 'You unlocked free shipping!', PT: 'Você ganhou frete grátis!' },
  'Añadí': { EN: 'Add', PT: 'Adicione' },
  'y conseguí': { EN: 'and get', PT: 'e ganhe' },
  'envío gratis': { EN: 'free shipping', PT: 'frete grátis' },
  'Tu carrito está vacío': { EN: 'Your cart is empty', PT: 'Seu carrinho está vazio' },
  'Seguir comprando': { EN: 'Continue shopping', PT: 'Continuar comprando' },
  'Talle': { EN: 'Size', PT: 'Tamanho' },
  'Dorsal': { EN: 'Custom', PT: 'Personalização' },
  'Eliminar': { EN: 'Remove', PT: 'Remover' },
  'Completa el look': { EN: 'Complete the look', PT: 'Complete o look' },
  'Subtotal': { EN: 'Subtotal', PT: 'Subtotal' },
  'Envío gratis aplicado': { EN: 'Free shipping applied', PT: 'Frete grátis aplicado' },
  'Envío calculado en el checkout': { EN: 'Shipping calculated at checkout', PT: 'Frete calculado no checkout' },
  'Iniciar compra': { EN: 'Checkout', PT: 'Finalizar compra' },

  // — AnnouncementBar —
  'Envío gratis desde $180.000': { EN: 'Free shipping over $180.000', PT: 'Frete grátis a partir de $180.000' },
  'Hasta 3 cuotas sin interés': { EN: 'Up to 3 interest-free installments', PT: 'Até 3x sem juros' },
  'Worldwide Shipping vía FedEx': { EN: 'Worldwide shipping via FedEx', PT: 'Envio mundial via FedEx' },
  '30 días para cambios y devoluciones': { EN: '30 days for exchanges & returns', PT: '30 dias para trocas e devoluções' },

  // — Footer —
  'Sets': {},
  'Envíos internacionales': { EN: 'International shipping', PT: 'Envios internacionais' },
  'Devoluciones': { EN: 'Returns', PT: 'Devoluções' },
  'RRSS': { EN: 'Social', PT: 'Redes' },
  'Suscribite y obtené un 10% de descuento': { EN: 'Subscribe and get 10% off', PT: 'Assine e ganhe 10% de desconto' },
  '*No es acumulable con otras promociones': { EN: '*Not combinable with other promotions', PT: '*Não acumulável com outras promoções' },
  '✓ ¡Listo! Ya sos parte del círculo.': { EN: "✓ Done! You're part of the circle.", PT: '✓ Pronto! Você já faz parte do círculo.' },
  'Streetwear desde Buenos Aires. Drops limitados.': { EN: 'Streetwear from Buenos Aires. Limited drops.', PT: 'Streetwear de Buenos Aires. Drops limitados.' },
  'Envíos a todo el mundo.': { EN: 'Worldwide shipping.', PT: 'Enviamos para o mundo todo.' },

  // — /worldwide —
  // Es la única página pensada para el que compra de afuera y estaba entera en
  // español, incluso para alguien que ya había puesto el sitio en inglés.
  'Envíos Internacionales': { EN: 'International Shipping', PT: 'Envios Internacionais' },
  'Llevamos Hypestyle a todo el mundo. Drops limitados, sin importar dónde estés.': {
    EN: 'We ship Hypestyle worldwide. Limited drops, wherever you are.',
    PT: 'Levamos a Hypestyle para o mundo todo. Drops limitados, onde quer que você esteja.',
  },
  'Zonas de envío': { EN: 'Shipping zones', PT: 'Zonas de envio' },
  'Preguntas frecuentes': { EN: 'Frequently asked questions', PT: 'Perguntas frequentes' },
  '¿Dudas con tu pedido internacional?': {
    EN: 'Questions about your international order?',
    PT: 'Dúvidas sobre seu pedido internacional?',
  },
  'Contactanos por WhatsApp': { EN: 'Contact us on WhatsApp', PT: 'Fale conosco no WhatsApp' },

  // Zonas — son las cuatro del tarifario de Boxfly (ver lib/shipping-intl).
  // Si cambian ahí, hay que cambiarlas acá también: los textos de lib/worldwide
  // son las claves de este diccionario.
  'América': { EN: 'Americas', PT: 'América' },
  'Estados Unidos, Canadá, México, Brasil, Chile, Uruguay, Colombia, Perú y más': {
    EN: 'United States, Canada, Mexico, Brazil, Chile, Uruguay, Colombia, Peru and more',
    PT: 'Estados Unidos, Canadá, México, Brasil, Chile, Uruguai, Colômbia, Peru e mais',
  },
  'Europa': { EN: 'Europe', PT: 'Europa' },
  'España, Italia, Francia, Alemania, Reino Unido, Portugal y más': {
    EN: 'Spain, Italy, France, Germany, United Kingdom, Portugal and more',
    PT: 'Espanha, Itália, França, Alemanha, Reino Unido, Portugal e mais',
  },
  'Asia': { EN: 'Asia', PT: 'Ásia' },
  'Japón, Corea del Sur, Singapur, Hong Kong, India, Emiratos Árabes e Israel': {
    EN: 'Japan, South Korea, Singapore, Hong Kong, India, United Arab Emirates and Israel',
    PT: 'Japão, Coreia do Sul, Singapura, Hong Kong, Índia, Emirados Árabes e Israel',
  },
  'Oceanía': { EN: 'Oceania', PT: 'Oceania' },
  'Australia y Nueva Zelanda': { EN: 'Australia and New Zealand', PT: 'Austrália e Nova Zelândia' },
  '7–15 días hábiles': { EN: '7–15 business days', PT: '7–15 dias úteis' },
  '10–18 días hábiles': { EN: '10–18 business days', PT: '10–18 dias úteis' },
  '12–20 días hábiles': { EN: '12–20 business days', PT: '12–20 dias úteis' },
  '12–22 días hábiles': { EN: '12–22 business days', PT: '12–22 dias úteis' },
  'FedEx': { EN: 'FedEx', PT: 'FedEx' },

  // FAQ de envíos
  '¿Cuándo se despacha mi pedido?': { EN: 'When is my order shipped?', PT: 'Quando meu pedido é enviado?' },
  'Los pedidos se despachan dentro de los 2–3 días hábiles posteriores a la confirmación del pago.': {
    EN: 'Orders ship within 2–3 business days after payment is confirmed.',
    PT: 'Os pedidos são enviados em até 2–3 dias úteis após a confirmação do pagamento.',
  },
  '¿Puedo rastrear mi envío?': { EN: 'Can I track my shipment?', PT: 'Posso rastrear meu envio?' },
  'Sí. Una vez despachado, te enviamos el número de seguimiento por WhatsApp o email.': {
    EN: 'Yes. Once shipped, we send you the tracking number by WhatsApp or email.',
    PT: 'Sim. Assim que enviado, mandamos o código de rastreio por WhatsApp ou e-mail.',
  },
  '¿Qué pasa si hay demoras en aduana?': { EN: 'What if there are customs delays?', PT: 'E se houver atrasos na alfândega?' },
  'Los tiempos de aduana son ajenos a Hypestyle. En caso de demoras, te acompañamos en el seguimiento.': {
    EN: 'Customs times are outside Hypestyle’s control. If there are delays, we help you follow up.',
    PT: 'Os prazos da alfândega não dependem da Hypestyle. Se houver atrasos, acompanhamos você no processo.',
  },
  '¿Los aranceles de importación están incluidos?': {
    EN: 'Are import duties included?',
    PT: 'As taxas de importação estão incluídas?',
  },
  'Los impuestos de importación quedan a cargo de quien recibe, según la normativa de cada país. El precio del envío sí incluye el flete, el seguro por pérdida o daño y los impuestos de exportación de Argentina.': {
    EN: 'Import taxes are paid by the recipient, under each country’s regulations. The shipping price does include freight, insurance against loss or damage, and Argentine export taxes.',
    PT: 'Os impostos de importação ficam por conta de quem recebe, conforme a legislação de cada país. O preço do envio inclui frete, seguro contra perda ou dano e os impostos de exportação da Argentina.',
  },
  '¿Cuánto sale el envío?': { EN: 'How much is shipping?', PT: 'Quanto custa o envio?' },
  'Se calcula en el checkout según lo que lleves y a qué país va, y se paga junto con el pedido. El precio queda cerrado antes de pagar.': {
    EN: 'It is calculated at checkout based on what you order and where it ships, and you pay it with your order. The price is final before you pay.',
    PT: 'É calculado no checkout conforme o que você leva e o país de destino, e você paga junto com o pedido. O preço fica fechado antes do pagamento.',
  },
};

export function translate(text: string, lang: Language): string {
  if (lang === 'ES') return text;
  return DICT[text]?.[lang] ?? text;
}
