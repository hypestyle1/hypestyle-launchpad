/**
 * Moldes: las medidas reales de cada prenda, por talle, en centímetros.
 *
 * De dónde salen: son las mismas tablas que ve el cliente en el modal "Guía de
 * talles" (atributo `size-guide` del producto en Woo). El 29/10/2026 se bajaron
 * las 18 imágenes distintas que hay publicadas y se transcribieron acá para que
 * el recomendador pueda razonar con ellas — una imagen JPG no se puede leer
 * desde el código.
 *
 * Por eso cada molde se identifica por un pedazo del nombre de archivo de su
 * imagen: el producto ya apunta a su tabla en Woo, acá solo la traducimos a
 * números. Si una tabla cambia en Woo, HAY QUE actualizar también este archivo
 * (y subir VERSION_MOLDES).
 *
 * Convención de medidas, igual que en las imágenes (medido en plano):
 *  - Prendas de arriba: `ancho` = de axila a axila (la mitad del contorno de
 *    pecho de la prenda), `largo` = del hombro al ruedo, `manga` = del hombro
 *    al puño.
 *  - Pantalones y bermudas: `cintura` = la mitad del contorno de cintura,
 *    `largo` = de la cintura al ruedo, `muslo` = la mitad del contorno de muslo.
 *
 * Todo en centímetros. Las propias tablas avisan: ±1 a 2 cm de confección.
 */

export const VERSION_MOLDES = '2026-10-29';

/** Una fila de la tabla: un talle con sus medidas. */
export interface FilaMolde {
  talle: string;
  /** Prendas de arriba: mitad del contorno de pecho. */
  ancho?: number;
  /** Del hombro al ruedo (arriba) o de la cintura al ruedo (abajo). */
  largo?: number;
  /** Del hombro al puño. */
  manga?: number;
  /** Pantalones: mitad del contorno de cintura. */
  cintura?: number;
  /** Pantalones: mitad del contorno de muslo. */
  muslo?: number;
}

export type TipoMolde = 'arriba' | 'abajo';

export interface Molde {
  id: string;
  /** Cómo se llama en una conversación ("remera regular", "buzo boxy"). */
  nombre: string;
  tipo: TipoMolde;
  /**
   * Holgura de pecho que busca el molde: cuántos cm más que el contorno de
   * pecho de la persona tiene que medir la prenda para caer como fue diseñada.
   * Una remera regular busca apenas 6 cm; un buzo boxy, 30.
   *
   * CALIBRACIÓN (29/10/2026): salen de cruzar el corte de cada tabla con los
   * modelos de las fichas ("Bauti mide 1.77 y usa S" en la Waffle Sleeveless,
   * "Meli mide 1.70 y usa M" en el Zip Hoodie). Son la perilla principal del
   * recomendador: si las recomendaciones salen chicas, subir; si salen
   * grandes, bajar. Pendiente de validar con prenda física.
   */
  holguraPecho?: number;
  /**
   * Largo ideal como fracción de la altura de la persona. Una remera regular
   * cae al 0,377 de la altura (1,75 m → 66 cm, que es justo el talle M de la
   * tabla); un buzo boxy es cropped y cae al 0,331.
   */
  coefLargo: number;
  /** Largo de manga ideal como fracción de la altura (solo si la tabla la trae). */
  coefManga?: number;
  /**
   * Holgura de cintura que busca el molde (pantalones). Más alta que la de
   * pecho porque son todos de cintura elástica con cordón y se usan apoyados
   * en la cadera, no en la cintura natural.
   */
  holguraCintura?: number;
  filas: FilaMolde[];
  /**
   * Pedazos del nombre de archivo de la imagen `size-guide` en Woo que caen en
   * este molde. En minúscula; se busca por "incluye".
   */
  guias: string[];
  /** Avisos conocidos de la tabla (se registran, no se corrigen en silencio). */
  nota?: string;
}

const T = (talle: string, largo: number, ancho: number, manga?: number): FilaMolde =>
  manga === undefined ? { talle, largo, ancho } : { talle, largo, ancho, manga };

export const MOLDES: Molde[] = [
  {
    id: 'remera-regular',
    nombre: 'remera de corte regular',
    tipo: 'arriba',
    // Baja a propósito: esta tabla está cortada justa (el M da 98 cm de
    // contorno) y el algodón cede. Con 6 cm de holgura el recomendador
    // mandaba a L y XL a cuerpos que en los pedidos reales compran M — el mix
    // medido de las Regular Tees es S 25 · M 40 · L 28 · XL 6.
    holguraPecho: 2,
    coefLargo: 0.377,
    guias: ['tabla-talles-regular-2026'],
    filas: [T('S', 64, 46), T('M', 66, 49), T('L', 68, 52), T('XL', 70, 55)],
  },
  {
    id: 'remera-oversize',
    nombre: 'remera oversize',
    tipo: 'arriba',
    holguraPecho: 19,
    coefLargo: 0.394,
    guias: ['oversize-fe6fc960'],
    filas: [T('S', 67, 58), T('M', 69, 60), T('L', 71, 62), T('XL', 73, 64)],
  },
  {
    id: 'longsleeve-oversize',
    nombre: 'remera de manga larga',
    tipo: 'arriba',
    holguraPecho: 19,
    coefLargo: 0.394,
    coefManga: 0.483,
    guias: ['talle-long-a7efaa0b'],
    filas: [T('S', 67, 58, 83), T('M', 69, 60, 84.5), T('L', 71, 62, 86), T('XL', 73, 64, 87.5)],
  },
  {
    id: 'longsleeve-regular',
    nombre: 'remera de manga larga',
    tipo: 'arriba',
    // Mismo cuerpo que la remera regular: lo único que cambia es la manga
    // (Valentín, 29/10/2026). Por eso comparte holgura y coeficiente de largo
    // con `remera-regular` y NO con `longsleeve-oversize`, que es 12 cm más
    // ancha por talle.
    holguraPecho: 2,
    coefLargo: 0.377,
    // Sin `manga`: la medida todavía no está relevada. El recomendador
    // descarta solo los ejes sin datos, así que elige por pecho y largo, que
    // es lo que define el talle en esta prenda igual.
    guias: [],
    nota: 'Estos dos productos no tienen guía de talles cargada en Woo. Cuando se les haga la imagen, sumar acá el nombre de archivo y las medidas de manga.',
    filas: [T('S', 64, 46), T('M', 66, 49), T('L', 68, 52), T('XL', 70, 55)],
  },
  {
    id: 'buzo-boxy',
    nombre: 'buzo de silueta boxy',
    tipo: 'arriba',
    holguraPecho: 30,
    coefLargo: 0.331,
    coefManga: 0.366,
    guias: ['hoodie-6ee7f834', 'zip-2e1db8e7', 'hoodie-jpg-743f4949'],
    nota: 'La tabla publicada da XL más angosto que L (64 vs 65). El recomendador nunca trata un talle más grande como más angosto que el anterior; igual conviene revisar la imagen.',
    filas: [T('S', 55, 62, 62), T('M', 58, 64, 64), T('L', 60, 65, 66), T('XL', 62, 64, 66)],
  },
  {
    id: 'remera-boxy',
    nombre: 'remera de silueta boxy',
    tipo: 'arriba',
    holguraPecho: 27,
    coefLargo: 0.331,
    guias: ['tabla-talles-only-god'],
    nota: 'Misma observación que el buzo boxy: XL (64) queda más angosto que L (65) en la tabla publicada.',
    filas: [T('S', 55, 62), T('M', 58, 64), T('L', 60, 65), T('XL', 62, 64)],
  },
  {
    id: 'musculosa-raglan',
    nombre: 'musculosa',
    tipo: 'arriba',
    holguraPecho: 19,
    coefLargo: 0.394,
    guias: ['ranglan-13d6eead', 'ranglan-e5bba3a0'],
    filas: [T('S', 67, 58), T('M', 69, 60), T('L', 71, 62), T('XL', 73, 64)],
  },
  {
    id: 'remera-mesh',
    nombre: 'remera de mesh',
    tipo: 'arriba',
    holguraPecho: 19,
    coefLargo: 0.394,
    coefManga: 0.234,
    guias: ['tablamesh-1-839c9886'],
    filas: [T('S', 67, 58, 40), T('M', 69, 60, 41), T('L', 71, 62, 43), T('XL', 73, 64, 44)],
  },
  {
    id: 'jersey',
    nombre: 'jersey',
    tipo: 'arriba',
    holguraPecho: 17,
    coefLargo: 0.394,
    guias: ['fileteado-jersey-568477a8'],
    filas: [T('S', 67, 58), T('M', 69, 60), T('L', 71, 62), T('XL', 73, 64)],
  },
  {
    id: 'jersey-la-nuestra',
    nombre: 'jersey',
    tipo: 'arriba',
    holguraPecho: 17,
    coefLargo: 0.394,
    coefManga: 0.283,
    guias: ['la-nuestra.jpg'],
    nota: 'Esta prenda solo se hizo en S y L.',
    filas: [T('S', 68, 57, 49), T('L', 72, 62, 51)],
  },
  {
    id: 'top',
    nombre: 'top',
    tipo: 'arriba',
    holguraPecho: -4,
    coefLargo: 0.263,
    guias: ['tank-top-jpg-f0821530'],
    nota: 'Talle único: el recomendador no elige, solo dice cómo va a caer.',
    filas: [{ talle: 'Único', largo: 44, ancho: 32 }],
  },
  {
    id: 'pantalon',
    nombre: 'pantalón',
    tipo: 'abajo',
    holguraCintura: 10,
    coefLargo: 0.566,
    guias: ['pant-jpg-7f4bce84'],
    filas: [
      { talle: 'S', cintura: 46, largo: 97, muslo: 34 },
      { talle: 'M', cintura: 48, largo: 99, muslo: 34 },
      { talle: 'L', cintura: 50, largo: 101, muslo: 37 },
      { talle: 'XL', cintura: 52, largo: 102, muslo: 38 },
    ],
  },
  {
    id: 'pantalon-bombe',
    nombre: 'pantalón',
    tipo: 'abajo',
    holguraCintura: 10,
    coefLargo: 0.514,
    guias: ['talles-1-f275b739'],
    nota: 'La tabla publicada de este pantalón da el contorno completo (95-104 cm de cintura), no la mitad como las demás: acá se guarda dividido por dos para que todas las tablas hablen el mismo idioma.',
    filas: [
      { talle: 'S', cintura: 47.5, largo: 87, muslo: 48.5 },
      { talle: 'M', cintura: 49, largo: 90, muslo: 50 },
      { talle: 'L', cintura: 50.5, largo: 93, muslo: 51.5 },
      { talle: 'XL', cintura: 52, largo: 96, muslo: 53 },
    ],
  },
  {
    id: 'bermuda',
    nombre: 'bermuda',
    tipo: 'abajo',
    holguraCintura: 10,
    coefLargo: 0.331,
    guias: ['talles-jort-1bf83f7d', 'jort-talles-9ae3e34b'],
    filas: [
      { talle: 'S', cintura: 48, largo: 56, muslo: 30 },
      { talle: 'M', cintura: 50, largo: 58, muslo: 31 },
      { talle: 'L', cintura: 52, largo: 60, muslo: 33 },
      { talle: 'XL', cintura: 55, largo: 62, muslo: 35 },
    ],
  },
];

/**
 * Molde de respaldo cuando el producto no tiene tabla cargada en Woo: se elige
 * por la categoría y el atributo Fit. Es un empate razonable, no la verdad —
 * lo correcto es cargarle la tabla al producto.
 */
const POR_FIT: { test: (fit: string, categoria: string) => boolean; molde: string }[] = [
  { test: (_f, c) => /bermuda|jort|short/i.test(c), molde: 'bermuda' },
  { test: (_f, c) => /pantal|sweatpant|jogger/i.test(c), molde: 'pantalon' },
  { test: (_f, c) => /hoodie|buzo|campera|zip|sweater/i.test(c), molde: 'buzo-boxy' },
  // En manga larga el fit decide, y la regla va ANTES que la de categoría: las
  // Athletic Dept azul y rosa son las dos únicas regular del catálogo y no
  // tienen tabla cargada, así que caían en el molde oversize —12 cm más ancho
  // por talle— y se les recomendaba un talle de menos.
  { test: (f, c) => /longsleeve|manga larga/i.test(c) && /regular|slim/i.test(f), molde: 'longsleeve-regular' },
  { test: (_f, c) => /longsleeve|manga larga|waffle/i.test(c), molde: 'longsleeve-oversize' },
  { test: (_f, c) => /musculosa|sleeveless|tank/i.test(c), molde: 'musculosa-raglan' },
  { test: (f) => /boxy/i.test(f), molde: 'remera-boxy' },
  { test: (f) => /oversize/i.test(f), molde: 'remera-oversize' },
  { test: (f) => /regular|slim/i.test(f), molde: 'remera-regular' },
];

const porId = new Map(MOLDES.map(m => [m.id, m]));

/**
 * Qué molde le corresponde a un producto. Primero por su imagen de guía de
 * talles (que es lo que el cliente ya ve), después por categoría y fit.
 * Devuelve null si no hay con qué: ahí el asesor no se ofrece.
 */
export function moldeDe(p: { sizeGuideImage?: string; fit?: string; category?: string }): Molde | null {
  const guia = (p.sizeGuideImage || '').toLowerCase();
  if (guia) {
    const m = MOLDES.find(mo => mo.guias.some(g => guia.includes(g)));
    if (m) return m;
  }
  const fit = p.fit || '';
  const cat = p.category || '';
  for (const r of POR_FIT) {
    if (r.test(fit, cat)) return porId.get(r.molde) ?? null;
  }
  return null;
}

export function moldePorId(id: string): Molde | null {
  return porId.get(id) ?? null;
}
