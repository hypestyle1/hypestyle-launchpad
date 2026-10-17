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
 * SELECCION POST, FRO ART MEDIA/export, POLIMA, MIR NICOLAS, JUGO, NEO PISTEA, FER PALACIO). Una foto por artista (dos si son productos distintos) y el orden alterna artistas.
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
  /**
   * Prendas que nunca estuvieron en Woo (merch de colabs): se muestran como
   * agotadas, sin link. Mockup en public/visto-en/prendas/.
   */
  fueraDeCatalogo?: { nombre: string; imagen: string }[];
  /** Link alternativo cuando sus prendas ya no están (ej. el lookbook de la colab). */
  link?: { href: string; label: string };
  alt: string;
  /** Video corto (mp4 720x1280, sin audio). La foto <id>.webp es el póster. */
  video?: string;
  slugs: string[];
}

export const vistoEnFoto = (post: VistoEnPost) => `/visto-en/${post.id}.webp`;

const GREY_HSTARS = ['hoodie-grey-hstars', 'sweatpant-grey-hstars'];
const CEROUNNO = ['half-zip-polo-black', 'only-god-can-judge-me-blanca', 'sweatpant-black-hstars'];
const CAMO = ['zip-hoodie-camo', 'sweatpant-camo'];

export const VISTO_EN: VistoEnPost[] = [
  // Una foto por artista; dos solo si muestran productos distintos (Nicki, Polima).
  { id: 'nicki-selfie', artista: 'Nicki Nicole', ig: ['nicki.nicole'], alt: 'Selfie de Nicki Nicole con el hoodie Grey HStars', slugs: ['hoodie-grey-hstars'] },
  // Polima en vivo: 7 s (27-34 del IMG_9636.MOV), en La Bresh (Córdoba) con la Eye Sleeveless.
  // Polima: su Instagram es @richboywest (@polimawestcoast es su X).
  { id: 'polima-video', artista: 'Polima Westcoast', ig: ['richboywest'], contexto: 'En vivo en La Bresh, Córdoba', alt: 'Polima Westcoast en el escenario de La Bresh con la Eye Sleeveless', slugs: ['eye-sleveless-wheat'], video: '/visto-en/polima-video.mp4' },
  { id: 'cerounno-01', artista: 'Cerounno', ig: ['cerounno'], alt: 'Cerounno con el Half-Zip Polo Black', slugs: CEROUNNO },
  { id: 'fro-f023', artista: 'FRO!', ig: ['frozouda'], contexto: 'Prueba de sonido de ART MEDIA', alt: 'FRO! con el conjunto camo en la prueba de sonido', slugs: CAMO },
  // Mir Nicolás: merch de La Ciudad del Pop (StyleRap&Culture), no está en Woo.
  { id: 'mir-04470', artista: 'Mir Nicolás', ig: ['mirnicolas.vyg'], contexto: 'La Ciudad del Pop', link: { href: '/lookbook-mir', label: 'Ver el lookbook' }, fueraDeCatalogo: [{ nombre: 'City Pop Tee Black', imagen: '/visto-en/prendas/city-pop-tee-black.webp' }], alt: 'Mir Nicolás con la remera de La Ciudad del Pop', slugs: [] },
  // Neo Pistea: merch oficial de CULTO, no está en Woo.
  { id: 'neo-blinblin', artista: 'Neo Pistea', ig: ['neopistea'], contexto: 'En vivo en Blin Blin, Mar del Plata', link: { href: '/lookbook-neo', label: 'Ver el lookbook' }, alt: 'Neo Pistea en vivo con la remera CULTO', slugs: [], fueraDeCatalogo: [{ nombre: 'CULTO Tee', imagen: '/visto-en/prendas/culto-tee.webp' }] },
  { id: 'nicki-tini', artista: 'Nicki Nicole y Tini', ig: ['nicki.nicole', 'tinistoessel'], alt: 'Nicki Nicole con la Mesh Camo Blue junto a Tini', slugs: ['mesh-camo-blue-tee'] },
  // Jugo: Black Zip Hoodie V2 y Beanie Tribals, nunca estuvieron en Woo.
  { id: 'jugo-01', artista: 'Jugo', ig: ['juicynise7'], alt: 'Jugo con el Black Zip Hoodie V2 y el Beanie Tribals', slugs: [], fueraDeCatalogo: [{ nombre: 'Black Zip Hoodie V2', imagen: '/visto-en/prendas/black-zip-hoodie-v2.webp' }, { nombre: 'Beanie Tribals', imagen: '/visto-en/prendas/beanie-tribals.webp' }] },
  // Fer Palacio: Ferpa Drop 2020, tirada de 40 que nunca se vendió.
  { id: 'ferpa-0142', artista: 'Fer Palacio', ig: ['ferpalaci0'], contexto: 'Ferpa Drop 2020', link: { href: '/lookbook-ferpa', label: 'Ver el lookbook' }, alt: 'Fer Palacio con el hoodie tie dye del Ferpa Drop', slugs: [], fueraDeCatalogo: [{ nombre: 'Ferpa Drop Hoodie Tie Dye', imagen: '/visto-en/prendas/ferpa-drop-hoodie.webp' }] },
  { id: 'polima-02', artista: 'Polima Westcoast', ig: ['richboywest'], alt: 'Polima Westcoast con el Crewneck Hyped Up! Black', slugs: ['crewneck-hyped-up-black'] },
];
