// Home del drop SS27 Part 01 (apertura pública 11/10/2026).
//
// Los productos NO se listan acá: salen de la colección (tag `ss27-part-01`,
// lib/ss27-coleccion-server.ts), así que cualquier prenda que se publique en
// Woo con el tag aparece sola. Acá solo vive lo editorial: qué foto o video
// va intercalado entre los productos y a qué ficha lleva, y cómo se agrupan
// los capítulos. Un slug que no esté publicado simplemente no se muestra.

const B = '/ss27/banner/';
const P = '/ss27/preview/';
const V = '/ss27/home/v/';

export type Ss27Media = {
  id: string;
  kind: 'img' | 'video';
  src: string;
  /** Primer cuadro del video (se ve mientras carga y con ahorro de datos). */
  poster?: string;
  alt: string;
  /** Texto chico arriba del título. */
  kicker?: string;
  title?: string;
  /** Ficha o colección a la que lleva el bloque. */
  href?: string;
};

const coleccion = '/colecciones/ss27/';
const ficha = (slug: string) => `/producto/${slug}`;

/** Videos verticales de estudio (9:16 y 4:5), recodificados a 720 px. */
export const SS27_VIDEOS = {
  estudio: { src: V + 'estudio-12s.mp4', poster: V + 'estudio-12s.jpg' },
  duo: { src: V + 'duo-hoodie-polo-grey.mp4', poster: V + 'duo-hoodie-polo-grey.jpg' },
  eagle: { src: V + 'eagle-18-hoodie.mp4', poster: V + 'eagle-18-hoodie.jpg' },
  splatter: { src: V + 'splatter-hoodie.mp4', poster: V + 'splatter-hoodie.jpg' },
  cross: { src: V + 'cross-waffle-white.mp4', poster: V + 'cross-waffle-white.jpg' },
} as const;

const v360 = (name: string) => ({ src: `${V}${name}-360.mp4`, poster: `${V}${name}-360.jpg` });

// ── Piezas editoriales ──────────────────────────────────────────────────────
export const SS27_MEDIA: Record<string, Ss27Media> = {
  duo:        { id: 'duo', kind: 'img', src: B + '01-duo.webp', alt: 'Hype Distressed Hoodie y Athletic Dept Polo, gris lavado', kicker: 'Spring Summer 27', title: 'Washed grey', href: ficha('hype-distressed-grey-hoodie') },
  duoVideo:   { id: 'duoVideo', kind: 'video', ...SS27_VIDEOS.duo, alt: 'Hoodie y polo gris lavado en movimiento', kicker: 'Film', title: 'Washed grey', href: ficha('athletic-dept-washed-grey-polo') },
  eagleEl:    { id: 'eagleEl', kind: 'img', src: B + '02-eagle-18-el.webp', alt: 'Eagle 18 Hoodie washed graphite', kicker: 'Hoodie', title: 'Золотые купола', href: ficha('zolotye-kupola-washed-graphite-hoodie') },
  eagleElla:  { id: 'eagleElla', kind: 'img', src: B + '03-eagle-18-ella.webp', alt: 'Eagle 18 Hoodie washed graphite, ella', kicker: 'Hoodie', title: 'Золотые купола', href: ficha('zolotye-kupola-washed-graphite-hoodie') },
  eagleVideo: { id: 'eagleVideo', kind: 'video', ...SS27_VIDEOS.eagle, alt: 'Eagle 18 Hoodie en movimiento', kicker: 'Hoodie', title: 'Золотые купола', href: ficha('zolotye-kupola-washed-graphite-hoodie') },
  lsPink:     { id: 'lsPink', kind: 'img', src: B + '04-athletic-ls-pink.webp', alt: 'Athletic Dept Longsleeve rosa', kicker: 'Athletic Dept', title: 'Longsleeve pink', href: ficha('athletic-dept-pink-longsleeve') },
  pisoLs:     { id: 'pisoLs', kind: 'img', src: B + '05-piso-athletic-ls.webp', alt: 'Athletic Dept Longsleeve azul y rosa en el piso', kicker: 'Athletic Dept', title: 'Longsleeves', href: ficha('athletic-dept-blue-longsleeve') },
  splatter:   { id: 'splatter', kind: 'img', src: B + '06-splatter.webp', alt: 'Splatter Hoodie washed grey', kicker: 'Hoodie', title: 'Splatter', href: ficha('splatter-hoodie-washed-grey') },
  splatterVideo: { id: 'splatterVideo', kind: 'video', ...SS27_VIDEOS.splatter, alt: 'Splatter Hoodie en movimiento', kicker: 'Hoodie', title: 'Splatter', href: ficha('splatter-hoodie-washed-grey') },
  scWaffle:   { id: 'scWaffle', kind: 'img', src: B + '07-sc-waffle.webp', alt: 'H.Y.P.E Waffle Longsleeve washed black', kicker: 'Waffle', title: 'Washed black', href: ficha('hype-washed-black-waffle-longsleeve') },
  polo:       { id: 'polo', kind: 'img', src: B + '08-polo.webp', alt: 'Athletic Dept Polo washed grey', kicker: 'Athletic Dept', title: 'Polo', href: ficha('athletic-dept-washed-grey-polo') },
  pisoBoxy:   { id: 'pisoBoxy', kind: 'img', src: B + '09-piso-athletic-boxy.webp', alt: 'Athletic Dept Boxy Tee blanca y navy en el piso', kicker: 'Athletic Dept', title: 'Boxy tees', href: ficha('athletic-dept-white-tee') },
  raglan:     { id: 'raglan', kind: 'img', src: B + '10-raglan-olive.webp', alt: 'HS Crest Raglan Longsleeve olive', kicker: 'Raglan', title: 'HS Crest', href: ficha('hs-crest-olive-raglan-longsleeve') },
  lsBlue:     { id: 'lsBlue', kind: 'img', src: B + '11-athletic-ls-blue.webp', alt: 'Athletic Dept Longsleeve azul', kicker: 'Athletic Dept', title: 'Longsleeve blue', href: ficha('athletic-dept-blue-longsleeve') },
  cross:      { id: 'cross', kind: 'img', src: B + '12-cross-waffle.webp', alt: 'Hype Dept Cross Waffle Longsleeve blanca', kicker: 'Waffle', title: 'Dept cross', href: ficha('hype-dept-cross-white-waffle-longsleeve') },
  crossVideo: { id: 'crossVideo', kind: 'video', ...SS27_VIDEOS.cross, alt: 'Hype Dept Cross Waffle en movimiento', kicker: 'Waffle', title: 'Dept cross', href: ficha('hype-dept-cross-white-waffle-longsleeve') },
  piso018:    { id: 'piso018', kind: 'img', src: B + '13-piso-018.webp', alt: 'Worn Varsity Club tees en el piso', kicker: 'Varsity', title: 'Worn Varsity Club', href: ficha('worn-varsity-club-white-tee') },
  waffleBlack:{ id: 'waffleBlack', kind: 'img', src: B + '14-waffle-black.webp', alt: 'Department of Culture Waffle washed black', kicker: 'Waffle', title: 'Department of Culture', href: ficha('department-of-culture-washed-black-waffle-longsleeve') },
  distressed: { id: 'distressed', kind: 'img', src: B + '15-distressed.webp', alt: 'Hype Distressed Hoodie washed grey', kicker: 'Hoodie', title: 'Distressed', href: ficha('hype-distressed-grey-hoodie') },
  duoApoyada: { id: 'duoApoyada', kind: 'img', src: B + '16-duo-apoyada.webp', alt: 'Hoodie gris y Athletic Dept Polo', kicker: 'Spring Summer 27', title: 'Part 01', href: coleccion },
  hHype:      { id: 'hHype', kind: 'img', src: B + '17-h-hype-split.webp', alt: 'H Hype Tee navy y blanca', kicker: 'Tee', title: 'H Hype', href: ficha('h-hype-navy-tee') },
  crestGrid:  { id: 'crestGrid', kind: 'img', src: B + '18-varsity-crest-grid.webp', alt: 'Style & Culture University tees en tres colores', kicker: 'Varsity', title: 'Style & Culture University', href: ficha('style-culture-university-black-tee') },
  varsityNavy:{ id: 'varsityNavy', kind: 'img', src: P + '20-varsity-crest-navy.webp', alt: 'Style & Culture University Tee navy', kicker: 'Varsity', title: 'University navy', href: ficha('style-culture-university-navy-tee') },
  flatlay:    { id: 'flatlay', kind: 'img', src: P + '29-flatlay-general.webp', alt: 'Spring Summer 27 Part 01 completa en el piso', kicker: 'Spring Summer 27', title: 'Part 01', href: coleccion },
};

/** Clips 360 (2,7 s, 4:5) para las celdas chicas que completan filas. */
export const SS27_LOOPS: Ss27Media[] = [
  { id: 'l-pink', kind: 'video', ...v360('athletic-dept-longsleeve-pink-mujer'), alt: 'Athletic Dept Longsleeve rosa, giro 360', title: 'Athletic Dept pink', href: ficha('athletic-dept-pink-longsleeve') },
  { id: 'l-eagle', kind: 'video', ...v360('eagle-18-hoodie-washed-graphite-mujer'), alt: 'Eagle 18 Hoodie, giro 360', title: 'Золотые купола', href: ficha('zolotye-kupola-washed-graphite-hoodie') },
  { id: 'l-018', kind: 'video', ...v360('hype-018-worn-varsity-boxy-tee-white-hombre'), alt: 'Worn Varsity Club Tee blanca, giro 360', title: 'Worn Varsity Club', href: ficha('worn-varsity-club-white-tee') },
  { id: 'l-raglan', kind: 'video', ...v360('raglan-crest-longsleeve-olive-mujer'), alt: 'HS Crest Raglan olive, giro 360', title: 'HS Crest raglan', href: ficha('hs-crest-olive-raglan-longsleeve') },
  { id: 'l-distressed', kind: 'video', ...v360('hype-distressed-hoodie-washed-grey-mujer'), alt: 'Distressed Hoodie, giro 360', title: 'Distressed hoodie', href: ficha('hype-distressed-grey-hoodie') },
  { id: 'l-blue', kind: 'video', ...v360('athletic-dept-longsleeve-blue-hombre'), alt: 'Athletic Dept Longsleeve azul, giro 360', title: 'Athletic Dept blue', href: ficha('athletic-dept-blue-longsleeve') },
  { id: 'l-hhype', kind: 'video', ...v360('h-hype-boxy-tee-navy-hombre'), alt: 'H Hype Tee navy, giro 360', title: 'H Hype navy', href: ficha('h-hype-navy-tee') },
  { id: 'l-waffle', kind: 'video', ...v360('hype-department-waffle-longsleeve-washed-black-mujer'), alt: 'Department of Culture Waffle, giro 360', title: 'Department of Culture', href: ficha('department-of-culture-washed-black-waffle-longsleeve') },
];

// ── Capítulos ───────────────────────────────────────────────────────────────
// Agrupan la colección por línea. Se arma por prefijo de slug: un producto
// nuevo de la misma línea entra solo; lo que no matchee ningún capítulo cae
// en el último ("Y más"), nunca desaparece.
export type Ss27Chapter = {
  id: string;
  title: string;
  /** Línea corta debajo del título. */
  line: string;
  match: (slug: string, category: string) => boolean;
  /** Foto o video que abre el capítulo, y las piezas que se intercalan. */
  cover: Ss27Media;
  inserts: Ss27Media[];
};

export const SS27_CHAPTERS: Ss27Chapter[] = [
  {
    id: 'athletic',
    title: 'Athletic Dept',
    line: 'Boxy tees, longsleeves y el polo. Est. 2018.',
    match: (s) => s.startsWith('athletic-dept'),
    cover: SS27_MEDIA.lsPink,
    inserts: [SS27_MEDIA.pisoBoxy, SS27_MEDIA.polo],
  },
  {
    id: 'varsity',
    title: 'Varsity',
    line: 'Style & Culture University, Worn Varsity Club y H Hype.',
    match: (s) => s.startsWith('style-culture') || s.startsWith('worn-varsity') || s.startsWith('h-hype'),
    cover: SS27_MEDIA.crestGrid,
    inserts: [SS27_MEDIA.piso018, SS27_MEDIA.hHype],
  },
  {
    id: 'waffle',
    title: 'Waffles & raglans',
    line: 'Tejido waffle lavado y raglans de manga estampada.',
    match: (s, c) => /waffle|raglan/.test(s) || c === 'Longsleeve',
    cover: SS27_MEDIA.waffleBlack,
    inserts: [SS27_MEDIA.crossVideo, SS27_MEDIA.raglan],
  },
  {
    id: 'hoodies',
    title: 'Hoodies',
    line: 'Lavados a mano, gastados a propósito.',
    match: (s, c) => c === 'Hoodie' || /hoodie/.test(s),
    cover: SS27_MEDIA.eagleVideo,
    inserts: [SS27_MEDIA.distressed, SS27_MEDIA.splatter],
  },
  {
    id: 'mas',
    title: 'Y más',
    line: 'Lo que completa el drop.',
    match: () => true,
    cover: SS27_MEDIA.flatlay,
    inserts: [],
  },
];

/** Reparte los productos en capítulos, en el orden de SS27_CHAPTERS (primer match gana). */
export function splitChapters<T extends { slug: string; category: string }>(products: T[]) {
  const buckets = SS27_CHAPTERS.map((c) => ({ chapter: c, items: [] as T[] }));
  for (const p of products) {
    const b = buckets.find((x) => x.chapter.match(p.slug, p.category));
    b?.items.push(p);
  }
  return buckets.filter((b) => b.items.length > 0);
}

/**
 * Orden de la grilla continua (opción A): intercala por línea para que el
 * scroll no sea 6 remeras iguales seguidas. Toma uno de cada capítulo por turno.
 */
export function interleave<T extends { slug: string; category: string }>(products: T[]) {
  const groups = splitChapters(products).map((g) => [...g.items]);
  const out: T[] = [];
  while (groups.some((g) => g.length)) for (const g of groups) if (g.length) out.push(g.shift()!);
  return out;
}

// ── Hero ────────────────────────────────────────────────────────────────────
/** Slides del carrusel provisorio: foto vertical, línea y ficha. */
export const SS27_HERO_SLIDES: Ss27Media[] = [
  SS27_MEDIA.duo,
  SS27_MEDIA.eagleElla,
  SS27_MEDIA.lsPink,
  SS27_MEDIA.cross,
  SS27_MEDIA.distressed,
  SS27_MEDIA.raglan,
  SS27_MEDIA.waffleBlack,
  SS27_MEDIA.lsBlue,
];

// ── Próximamente ────────────────────────────────────────────────────────────
/** Fotos de la celda "Próximamente" (al final de la grilla), en orden. */
export const SS27_PROXIMAMENTE: { src: string; alt: string }[] = [
  { src: '/ss27/home/proximamente-creative-goods.webp', alt: 'Hype Creative Goods Raglan Longsleeve rosa' },
  { src: '/ss27/home/proximamente-doc-eagle.webp', alt: 'Department of Culture Eagle Raglan Longsleeve rosa' },
];

/**
 * Productos que van en la home junto con SS27 sin tener el tag ss27-part-01
 * (no son de la colección, pero acompañan el drop). Salen del catálogo general
 * que el home ya precarga; no tocan /colecciones/ss27 ni Private Access.
 * Cuando la gorra nueva esté cargada en Woo, sumar su slug acá.
 */
export const SS27_HOME_EXTRA_SLUGS = ['pack-x3-medias-hype'];
