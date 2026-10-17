/**
 * Visto en — artistas de la escena usando Hype.
 *
 * Acá va solo lo editorial: la foto, quién es y qué lleva puesto (slugs de
 * Woo). Nombre, precio, miniatura y stock salen del catálogo (la query
 * ['products'] que el home ya precarga), como en el Shop the look. Una prenda
 * que se despublica desaparece sola; una agotada queda en gris.
 *
 * Fotos: 1080x1350 (4:5) en public/visto-en/, exportadas de las selecciones
 * aprobadas en `Redes & Pauta` (NICKI NICOLE/POST, CEROUNNO/FOTOS CEROUNNO/
 * SELECCION POST, FRO ART MEDIA/export). El orden alterna artistas a propósito.
 *
 * No se etiqueta a fotógrafos ni a modelos, solo al artista.
 */

export interface VistoEnPost {
  id: string;
  artista: string;
  /** Línea corta debajo del nombre en el modal (dónde o cuándo). */
  contexto?: string;
  alt: string;
  slugs: string[];
}

export const vistoEnFoto = (post: VistoEnPost) => `/visto-en/${post.id}.webp`;

const GREY_HSTARS = ['hoodie-grey-hstars', 'sweatpant-grey-hstars'];
const CEROUNNO = ['half-zip-polo-black', 'only-god-can-judge-me-blanca', 'sweatpant-black-hstars'];
const CAMO = ['zip-hoodie-camo', 'sweatpant-camo'];

export const VISTO_EN: VistoEnPost[] = [
  { id: 'nicki-auto', artista: 'Nicki Nicole', alt: 'Nicki Nicole en el auto con el conjunto Grey HStars', slugs: GREY_HSTARS },
  { id: 'cerounno-01', artista: 'Cerounno', alt: 'Cerounno con el Half-Zip Polo Black', slugs: CEROUNNO },
  { id: 'fro-f023', artista: 'FRO!', contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! con el conjunto camo en la prueba de sonido', slugs: CAMO },
  { id: 'nicki-selfie', artista: 'Nicki Nicole', alt: 'Selfie de Nicki Nicole con el hoodie Grey HStars', slugs: ['hoodie-grey-hstars'] },
  { id: 'cerounno-05', artista: 'Cerounno', alt: 'Cerounno con el Half-Zip Polo Black', slugs: CEROUNNO },
  { id: 'fro-f025', artista: 'FRO!', contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! sentado en el pasto con el conjunto camo', slugs: CAMO },
  { id: 'nicki-tini', artista: 'Nicki Nicole y Tini', alt: 'Nicki Nicole con la Mesh Camo Blue junto a Tini', slugs: ['mesh-camo-blue-tee'] },
  { id: 'cerounno-07', artista: 'Cerounno', alt: 'Cerounno de perfil con el Half-Zip Polo Black y el SweatPant Black HStars', slugs: CEROUNNO },
  { id: 'fro-f012', artista: 'FRO!', contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! con el Zip Hoodie Camo', slugs: CAMO },
];
