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
  'o regalá una gift card': { EN: 'or give a gift card', PT: 'ou presenteie um gift card' },
  'Regalá crédito · de $50.000 en adelante': { EN: 'Give store credit · from $50,000', PT: 'Presenteie crédito · a partir de $50.000' },
  'Gift Card · regalá crédito de a $50.000': { EN: 'Gift Card · store credit from $50,000', PT: 'Gift Card · crédito a partir de $50.000' },
  'Enviando...': { EN: 'Sending...', PT: 'Enviando...' },
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

  // — SpotifyPlayer —
  'Sonando en Hype': { EN: 'Now playing at Hype', PT: 'Tocando na Hype' },
  'Cerrar': { EN: 'Close', PT: 'Fechar' },

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
  // — Crea contenido con Hype (formulario público de creadores) —
  // Una creadora extranjera no pudo completar el formulario viejo porque
  // estaba entero en español, no encontró cómo traducirlo y se fue. Estas
  // claves son las que hacen que eso no vuelva a pasar.
  'Crea contenido': { EN: 'Create content', PT: 'Crie conteúdo' },
  'con Hype': { EN: 'with Hype', PT: 'com Hype' },
  'Buscamos gente que entienda la marca y quiera construir algo con nosotros. No nos importa cuánta gente te sigue: nos importa lo que hacés y cómo lo hacés.': {
    EN: 'We are looking for people who get the brand and want to build something with us. How many people follow you is not what matters: what you make and how you make it, is.',
    PT: 'Procuramos pessoas que entendam a marca e queiram construir algo conosco. Não importa quanta gente te segue: importa o que você faz e como faz.' },
  'Quién sos': { EN: 'About you', PT: 'Sobre você' },
  'Nombre y apellido': { EN: 'Full name', PT: 'Nome completo' },
  'Mail': { EN: 'Email', PT: 'E-mail' },
  'WhatsApp': { EN: 'WhatsApp', PT: 'WhatsApp' },
  'Ciudad': { EN: 'City', PT: 'Cidade' },
  'Edad': { EN: 'Age', PT: 'Idade' },
  'Como sos menor de 18, necesitamos los datos de un adulto responsable para poder trabajar juntos.': {
    EN: 'Since you are under 18, we need the details of a responsible adult so we can work together.',
    PT: 'Como você é menor de 18, precisamos dos dados de um adulto responsável para trabalharmos juntos.' },
  'Nombre del adulto responsable': { EN: 'Name of the responsible adult', PT: 'Nome do adulto responsável' },
  'Su teléfono o mail': { EN: 'Their phone or email', PT: 'Telefone ou e-mail dele(a)' },
  'Dónde te encontramos': { EN: 'Where we find you', PT: 'Onde te encontramos' },
  '@ de Instagram': { EN: 'Instagram handle', PT: '@ do Instagram' },
  '@ de TikTok': { EN: 'TikTok handle', PT: '@ do TikTok' },
  'Tu trabajo': { EN: 'Your work', PT: 'Seu trabalho' },
  'Pegá dos o tres links a piezas tuyas de las que estés orgulloso': {
    EN: 'Paste two or three links to work you are proud of',
    PT: 'Cole dois ou três links de trabalhos dos quais você se orgulha' },
  'Un reel, una foto, lo que sea que muestre cómo trabajás.': {
    EN: 'A reel, a photo, anything that shows how you work.',
    PT: 'Um reel, uma foto, qualquer coisa que mostre como você trabalha.' },
  '¿Con qué frecuencia podés producir?': { EN: 'How often can you produce?', PT: 'Com que frequência você pode produzir?' },
  'Una pieza por mes': { EN: 'One piece a month', PT: 'Uma peça por mês' },
  'Dos o tres por mes': { EN: 'Two or three a month', PT: 'Duas ou três por mês' },
  'Todas las semanas': { EN: 'Every week', PT: 'Toda semana' },
  '¿Con qué grabás y editás?': { EN: 'What do you shoot and edit with?', PT: 'Com o que você grava e edita?' },
  'Celular, edito yo': { EN: 'Phone, I edit', PT: 'Celular, eu edito' },
  'Celular, me edita alguien': { EN: 'Phone, someone edits for me', PT: 'Celular, alguém edita para mim' },
  'Cámara, edito yo': { EN: 'Camera, I edit', PT: 'Câmera, eu edito' },
  'Cámara, trabajo con un editor': { EN: 'Camera, I work with an editor', PT: 'Câmera, trabalho com um editor' },
  'Vos y la marca': { EN: 'You and the brand', PT: 'Você e a marca' },
  '¿Por qué querés crear con Hype?': { EN: 'Why do you want to create with Hype?', PT: 'Por que você quer criar com a Hype?' },
  '¿Qué prenda de Hype te pondrías mañana, y por qué esa?': {
    EN: 'Which Hype piece would you wear tomorrow, and why that one?',
    PT: 'Qual peça da Hype você usaria amanhã, e por que essa?' },
  '¿Qué talle usás?': { EN: 'What size do you wear?', PT: 'Que tamanho você usa?' },
  '¿Trabajaste con otras marcas? (opcional)': {
    EN: 'Have you worked with other brands? (optional)',
    PT: 'Você já trabalhou com outras marcas? (opcional)' },
  'Enviar postulación': { EN: 'Send application', PT: 'Enviar candidatura' },
  'La revisa nuestra content manager. Si hay match, te escribimos.': {
    EN: 'Our content manager reviews it. If there is a match, we will write to you.',
    PT: 'Nossa content manager revisa. Se houver match, entramos em contato.' },
  'Recibimos tu postulación': { EN: 'We got your application', PT: 'Recebemos sua candidatura' },
  'Actualizamos tu postulación': { EN: 'We updated your application', PT: 'Atualizamos sua candidatura' },
  'Volver al sitio': { EN: 'Back to the site', PT: 'Voltar ao site' },
  'Nos falta': { EN: 'We still need', PT: 'Ainda falta' },
  'tu nombre': { EN: 'your name', PT: 'seu nome' },
  'un mail válido': { EN: 'a valid email', PT: 'um e-mail válido' },
  'al menos una cuenta': { EN: 'at least one account', PT: 'ao menos uma conta' },
  'por qué querés crear con nosotros': { EN: 'why you want to create with us', PT: 'por que você quer criar conosco' },
  'los datos de un adulto responsable': { EN: 'the details of a responsible adult', PT: 'os dados de um adulto responsável' },
  'No pudimos enviar tu postulación': { EN: 'We could not send your application', PT: 'Não conseguimos enviar sua candidatura' },
  'Idioma': { EN: 'Language', PT: 'Idioma' },

};

export function translate(text: string, lang: Language): string {
  if (lang === 'ES') return text;
  return DICT[text]?.[lang] ?? text;
}
