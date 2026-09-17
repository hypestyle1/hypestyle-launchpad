import type { Language } from '@/context/LocaleContext';

/**
 * Contenido de las páginas estáticas (políticas, FAQs, contacto, nosotros,
 * privacidad) en los seis idiomas del selector. La interfaz (navbar, carrito,
 * tarjetas) se traduce con `t()` de lib/i18n.ts, pero esas páginas son texto
 * largo con listas, negritas y links: acá cada página tiene su módulo con un
 * objeto por idioma y la misma forma en todos, y `tests/unit/page-content.test.ts`
 * falla si a un idioma le falta una sección, un párrafo o un ítem.
 *
 * Los strings admiten `**negrita**` y `[texto](url)`; los pinta <RichText>.
 * Nada de JSX acá: vitest corre estos módulos en node.
 *
 * (Va en lib/pages/ y no en lib/content/: esa carpeta es del Content OS del
 * panel admin.)
 */
export type Localized<T> = Record<Language, T>;

export type Block =
  | { p: string; strong?: boolean }
  | { ol: string[] }
  | { ul: string[] };

export type Section = { title: string; blocks: Block[] };
