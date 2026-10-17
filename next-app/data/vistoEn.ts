/**
 * Visto en — artistas de la escena usando Hype.
 *
 * Acá va solo lo editorial: la foto, quién es y qué lleva puesto (slugs de
 * Woo). Nombre, precio, miniatura y stock salen del catálogo (la query
 * ['products'] que el home ya precarga), como en el Shop the look. Una prenda
 * agotada queda en gris; una que ya no está en el catálogo no aparece. Las
 * fotos viejas suman igual: si no queda ninguna prenda, el post se muestra y el
 * modal lo aclara.
 *
 * Fotos: 1080x1350 (4:5) en public/visto-en/, exportadas de las selecciones
 * aprobadas en `Redes & Pauta` (NICKI NICOLE/POST, CEROUNNO/FOTOS CEROUNNO/
 * SELECCION POST, FRO ART MEDIA/export, POLIMA, MIR NICOLAS). El orden alterna artistas a propósito.
 *
 * No se etiqueta a fotógrafos ni a modelos, solo al artista.
 */

export interface VistoEnPost {
  id: string;
  artista: string;
  /** Usuario de Instagram, sin @. Verificados el 17/10/2026. */
  ig: string[];
  /** Línea corta debajo del nombre en el modal (dónde o cuándo). */
  contexto?: string;
  /** Link alternativo cuando sus prendas ya no están (ej. el lookbook de la colab). */
  link?: { href: string; label: string };
  alt: string;
  slugs: string[];
}

export const vistoEnFoto = (post: VistoEnPost) => `/visto-en/${post.id}.webp`;

const GREY_HSTARS = ['hoodie-grey-hstars', 'sweatpant-grey-hstars'];
const CEROUNNO = ['half-zip-polo-black', 'only-god-can-judge-me-blanca', 'sweatpant-black-hstars'];
const CAMO = ['zip-hoodie-camo', 'sweatpant-camo'];

export const VISTO_EN: VistoEnPost[] = [
  { id: 'nicki-auto', artista: 'Nicki Nicole', ig: ['nicki.nicole'], alt: 'Nicki Nicole en el auto con el conjunto Grey HStars', slugs: GREY_HSTARS },
  // Polima: su Instagram es @richboywest (@polimawestcoast es su X).
  { id: 'polima-01', artista: 'Polima Westcoast', ig: ['richboywest'], alt: 'Polima Westcoast con el Crewneck Hyped Up! Black', slugs: ['crewneck-hyped-up-black'] },
  { id: 'cerounno-01', artista: 'Cerounno', ig: ['cerounno'], alt: 'Cerounno con el Half-Zip Polo Black', slugs: CEROUNNO },
  { id: 'fro-f023', artista: 'FRO!', ig: ['frozouda'], contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! con el conjunto camo en la prueba de sonido', slugs: CAMO },
  // Mir Nicolás: merch de La Ciudad del Pop (StyleRap&Culture), no está en Woo.
  { id: 'mir-04470', artista: 'Mir Nicolás', ig: ['mirnicolas.vyg'], contexto: 'La Ciudad del Pop', link: { href: '/lookbook-mir', label: 'Ver el lookbook' }, alt: 'Mir Nicolás con la remera de La Ciudad del Pop', slugs: [] },
  { id: 'nicki-selfie', artista: 'Nicki Nicole', ig: ['nicki.nicole'], alt: 'Selfie de Nicki Nicole con el hoodie Grey HStars', slugs: ['hoodie-grey-hstars'] },
  { id: 'cerounno-05', artista: 'Cerounno', ig: ['cerounno'], alt: 'Cerounno con el Half-Zip Polo Black', slugs: CEROUNNO },
  { id: 'fro-f025', artista: 'FRO!', ig: ['frozouda'], contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! sentado en el pasto con el conjunto camo', slugs: CAMO },
  { id: 'mir-04544', artista: 'Mir Nicolás', ig: ['mirnicolas.vyg'], contexto: 'La Ciudad del Pop', link: { href: '/lookbook-mir', label: 'Ver el lookbook' }, alt: 'Mir Nicolás y amigos con el merch de La Ciudad del Pop', slugs: [] },
  { id: 'nicki-tini', artista: 'Nicki Nicole y Tini', ig: ['nicki.nicole', 'tinistoessel'], alt: 'Nicki Nicole con la Mesh Camo Blue junto a Tini', slugs: ['mesh-camo-blue-tee'] },
  { id: 'cerounno-07', artista: 'Cerounno', ig: ['cerounno'], alt: 'Cerounno de perfil con el Half-Zip Polo Black y el SweatPant Black HStars', slugs: CEROUNNO },
  { id: 'fro-f012', artista: 'FRO!', ig: ['frozouda'], contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! con el Zip Hoodie Camo', slugs: CAMO },
];
