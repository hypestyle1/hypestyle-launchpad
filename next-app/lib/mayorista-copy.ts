// Textos fijos del portal mayorista. Lo que depende de la campaña (badge,
// headline, texto, CTA, línea secundaria) vive en la campaña misma
// (/admin/mayoristas/campanas); acá va lo que no cambia con cada campaña.
// Castellano rioplatense, simple, sin lenguaje de outlet.

/** Teaser del próximo drop. Se muestra como línea secundaria del hero de
 *  marca y, si la campaña no trae `secondary`, también en el hero de
 *  campaña. Vacío = no se muestra. */
export const NEXT_DROP_LABEL = '04.10';

/** Línea secundaria del hero: "Próximo drop 04.10". */
export const NEXT_DROP_TEXT = NEXT_DROP_LABEL ? `Próximo drop ${NEXT_DROP_LABEL}` : '';

export const WHATSAPP_NUMBER = '5491178292430';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, escribo por el catálogo mayorista de Hype.')}`;

export const MIN_ORDER_LABEL = '$500.000';

/** Los seis pilares. Van en el catálogo (fila) y en la página pública.
 *  Lo que un local compara cuando elige marca (aprendido del catálogo de
 *  Shaka, sep-26): precio, stock, mínimo, drops, material y zona. */
export const WHOLESALE_HOW_IT_WORKS = [
  { title: '50% OFF PVP', text: 'Comprás a la mitad del precio de venta al público, en todo el catálogo. Marcás 100% sobre tu costo.' },
  { title: 'Stock en vivo', text: 'Lo que ves es lo que hay en depósito, por talle. Sin sorpresas al confirmar.' },
  { title: 'Surtido libre', text: 'Talles y modelos sueltos, sin mínimo por modelo. Armás el pedido como lo vende tu local.' },
  { title: `Pedido mínimo ${MIN_ORDER_LABEL}`, text: 'A precio mayorista. La barra del pedido te muestra cuánto falta.' },
  { title: 'Drops antes que el público', text: `Tiradas cortas, sin reposición asegurada. Los mayoristas activos piden primero.${NEXT_DROP_LABEL ? ` Próximo: ${NEXT_DROP_LABEL}.` : ''}` },
  { title: 'Material para tus redes', text: 'Fotos de producto y de campaña listas para publicar, con cada pedido.' },
] as const;

export const BRAND_HERO = {
  eyebrow: 'HYPE MAYORISTAS',
  headline: 'Tu precio: 50% del PVP.',
  text: 'Stock en vivo, surtido libre. Pedís hoy, lo preparamos esta semana.',
  cta: 'Ver catálogo',
} as const;

/** Secciones de /mayoristas/como-funciona. */
export const HOW_IT_WORKS_SECTIONS = [
  {
    id: 'cuenta',
    title: 'Cómo pedir una cuenta',
    items: [
      'Completá la solicitud con razón social, CUIT, Instagram y ciudad. Lleva dos minutos.',
      'Contanos si tenés local a la calle, showroom, venta online o ferias.',
      'Elegís tu contraseña en el mismo formulario; no hace falta esperar un mail para crearla.',
    ],
  },
  {
    id: 'aprobacion',
    title: 'Cómo funciona la aprobación',
    items: [
      'Revisamos cada solicitud a mano. Buscamos locales y proyectos que cuiden la marca.',
      'Te avisamos por mail cuando la cuenta queda aprobada; desde ese momento entrás con tu usuario y contraseña.',
      'Si tu ciudad ya tiene un local activo con Hype, te lo decimos antes de aprobar.',
    ],
  },
  {
    id: 'pedido',
    title: 'Cómo armar el pedido',
    items: [
      'Ves el catálogo completo con tu precio (50% del PVP) y el stock real por talle.',
      'Ves el PVP al lado de tu precio, así sabés de entrada cuánto marcás por prenda.',
      'Sumás talles sueltos desde la card o la ficha. Podés guardar borradores y retomarlos después.',
      `El pedido mínimo es ${MIN_ORDER_LABEL} a precio mayorista; la barra te muestra cuánto falta y el carrito te sugiere cómo completarlo.`,
      'Al confirmar, cargás los datos de envío una sola vez y te llega el resumen por mail, con PDF y planilla.',
    ],
  },
  {
    id: 'pago',
    title: 'Formas de pago',
    items: [
      'Transferencia bancaria. Te mandamos los datos con el resumen del pedido.',
      'E-cheq para pedidos grandes, a coordinar por WhatsApp antes de confirmar.',
      'El pedido se prepara una vez acreditado el pago. Sin pago no se reserva stock por más de unos días.',
      'Si tenés saldo a favor (por un cambio o una falla), se descuenta solo en el próximo pedido.',
    ],
  },
  {
    id: 'envios',
    title: 'Envíos',
    items: [
      'Via Cargo a sucursal, Andreani a domicilio o a sucursal, o un expreso a coordinar.',
      'El envío se paga en destino, salvo que coordinemos otra cosa.',
      'Preparamos en la semana. Te avisamos con el número de seguimiento.',
    ],
  },
  {
    id: 'drops',
    title: 'Drops y reposición',
    items: [
      'Lanzamos en tiradas cortas. Lo que se agota no siempre vuelve: si una pieza te funciona, pedila en el drop.',
      `Los mayoristas activos ven y piden cada drop antes del lanzamiento al público.${NEXT_DROP_LABEL ? ` Próximo drop: ${NEXT_DROP_LABEL}.` : ''}`,
      'Cuando hay reposición de un básico, avisamos primero a quienes lo pidieron.',
    ],
  },
  {
    id: 'material',
    title: 'Material para tus redes',
    items: [
      'Con cada pedido te pasamos las fotos de producto y de campaña de lo que compraste, listas para publicar.',
      'Logo y lineamientos de marca para tu local, vidriera y redes. Los pedís por WhatsApp.',
      'Si nos etiquetás, compartimos: tu local aparece en nuestras redes.',
    ],
  },
  {
    id: 'exclusividad',
    title: 'Exclusividad por ciudad',
    items: [
      'Se gana pidiendo seguido, no con un pedido grande: tres pedidos pagados, uno por mes.',
      'Se sostiene pidiendo en cada drop. Si dejás de pedir, se libera.',
      'Vale para tu ciudad y frena altas nuevas ahí; las cuentas que ya existen siguen comprando.',
      'Hoy la administramos a mano: consultanos por WhatsApp cuando quieras saber cómo estás.',
    ],
  },
  {
    id: 'soporte',
    title: 'Soporte',
    items: [
      'Cualquier duda, por WhatsApp. Respondemos en horario comercial.',
      'Cambios por falla: nos escribís con la foto y lo resolvemos con reposición o saldo a favor.',
    ],
  },
  {
    id: 'campanas',
    title: 'Campañas mayoristas',
    items: [
      'Cada tanto abrimos una ventana con un extra sobre tu precio mayorista en piezas seleccionadas. Se ve en el catálogo con la etiqueta y la fecha de cierre.',
      'El extra se aplica sobre el precio mayorista, no sobre el PVP, y no se combina con otras promociones.',
      'Termina el día indicado; después, los precios vuelven solos al mayorista normal.',
      'Las piezas marcadas “Sin reposición” no vuelven a producirse: lo que hay es lo que queda.',
    ],
  },
] as const;

export const FOOTER_CONDITIONS = [
  '50% del PVP en todo el catálogo',
  `Pedido mínimo ${MIN_ORDER_LABEL} a precio mayorista`,
  'Surtido libre, sin mínimo por modelo',
  'Pago por transferencia · e-cheq a coordinar',
  'Envío por Via Cargo, Andreani o expreso, a pagar en destino',
  'Preparación en la semana',
] as const;
