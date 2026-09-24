// Textos fijos del portal mayorista. Lo que depende de la campaña (badge,
// headline, texto, CTA, línea secundaria) vive en la campaña misma
// (/admin/mayoristas/campanas); acá va lo que no cambia con cada campaña.

/** Teaser del próximo drop. Se muestra como línea secundaria del hero de
 *  marca y, si la campaña no trae `secondary`, también en el hero de
 *  campaña. Vacío = no se muestra. */
export const NEXT_DROP_LABEL = '04.10';

export const WHOLESALE_HOW_IT_WORKS = [
  { title: '50% OFF PVP', text: 'Comprás a la mitad del precio de venta al público y marcás 100% sobre tu costo.' },
  { title: 'Stock en vivo', text: 'Lo que ves es lo que hay en depósito, por talle.' },
  { title: 'Surtido libre', text: 'Armás el pedido como quieras, sin mínimo por modelo.' },
  { title: 'Pedido mínimo', text: 'A precio mayorista; la barra te muestra cuánto falta.' },
  { title: 'Acceso a drops', text: 'Los mayoristas activos entran antes a cada lanzamiento.' },
] as const;

export const BRAND_HERO = {
  eyebrow: 'HYPE WHOLESALE',
  headline: 'Tu precio: 50% del PVP.',
  text: 'Stock en vivo, surtido libre. Pedís hoy, lo preparamos esta semana.',
  cta: 'Ver catálogo',
} as const;
