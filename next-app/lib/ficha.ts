/**
 * Datos y textos que la ficha de producto saca de lo que ya hay cargado:
 * fechas de entrega, orden de las fotos y composición de la tela.
 */
import fichaFotos from './ficha-fotos.json';

/** El plazo que ya promete el sitio en "Envíos y devoluciones". */
export const ENTREGA_DIAS_HABILES = { min: 5, max: 10 };

function sumarDiasHabiles(desde: Date, dias: number): Date {
  const d = new Date(desde);
  let restan = dias;
  while (restan > 0) {
    d.setDate(d.getDate() + 1);
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) restan--;
  }
  return d;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * "6 al 13 de octubre" o "29 de octubre al 4 de noviembre".
 * No descuenta feriados: es una estimación, igual que el plazo del que sale.
 */
export function ventanaEntrega(hoy: Date = new Date()): string {
  const desde = sumarDiasHabiles(hoy, ENTREGA_DIAS_HABILES.min);
  const hasta = sumarDiasHabiles(hoy, ENTREGA_DIAS_HABILES.max);
  if (desde.getMonth() === hasta.getMonth()) {
    return `${desde.getDate()} al ${hasta.getDate()} de ${MESES[hasta.getMonth()]}`;
  }
  return `${desde.getDate()} de ${MESES[desde.getMonth()]} al ${hasta.getDate()} de ${MESES[hasta.getMonth()]}`;
}

/**
 * Qué fotos de la galería son de él y cuáles de ella, por nombre de archivo.
 * Woo no guarda ese dato: hasta que exista un campo, se declara acá por
 * producto. Un producto que no figura no muestra el interruptor.
 */
const MODELOS_POR_SLUG: Record<string, { el: RegExp; ella: RegExp }> = {
  'camo-full-set-combo': { el: /\/camo-\d{4}/i, ella: /\/mia-camo/i },
};

export type Modelo = 'el' | 'ella';

export function tieneInterruptorModelo(slug: string, imagenes: string[]): boolean {
  const regla = MODELOS_POR_SLUG[slug];
  if (!regla) return false;
  return imagenes.some((i) => regla.el.test(i)) && imagenes.some((i) => regla.ella.test(i));
}

/** Arranca con quien aparece primero en la galería de Woo. */
export function modeloInicial(slug: string, imagenes: string[]): Modelo {
  const regla = MODELOS_POR_SLUG[slug];
  const primera = imagenes.find((i) => regla?.el.test(i) || regla?.ella.test(i));
  return primera && regla?.ella.test(primera) ? 'ella' : 'el';
}

/** Las fotos del modelo elegido primero; después las que no son de ninguno (mockups, detalle). */
export function filtrarPorModelo(slug: string, imagenes: string[], modelo: Modelo): string[] {
  const regla = MODELOS_POR_SLUG[slug];
  if (!regla) return imagenes;
  const propias = imagenes.filter((i) => regla[modelo].test(i));
  const neutras = imagenes.filter((i) => !regla.el.test(i) && !regla.ella.test(i));
  return [...propias, ...neutras];
}

const FOTOS: Record<string, { mockups: string[]; tablas: string[]; cuadrada?: boolean }> = fichaFotos;

/**
 * ¿La imagen que abre la ficha es cuadrada? En mobile el marco la sigue: una
 * foto cuadrada en un marco vertical se amplía y se recorta a los costados.
 * Un producto sin clasificar se trata como cuadrado, que es lo más común.
 */
export function abreCuadrada(slug: string): boolean {
  return FOTOS[slug]?.cuadrada ?? true;
}

const archivo = (url: string) => {
  const ultimo = url.split('/').pop()?.split('?')[0] ?? '';
  try { return decodeURIComponent(ultimo); } catch { return ultimo; }
};

/**
 * Orden de la galería en la ficha: primero las fotos con una persona usando la
 * prenda, después los mockups y al final la tabla de talles.
 *
 * Entre los mockups va primero la destacada de Woo, que es siempre el frente:
 * un producto que solo tiene mockups abre con el frente.
 *
 * Qué es cada imagen sale de lib/ficha-fotos.json, que genera
 * `node scripts/clasificar-fotos-ficha.js`. Un producto que todavía no figura
 * ahí usa la galería de Woo tal cual, con la destacada al final.
 */
export function ordenarFotos(slug: string, imagenes: string[]): string[] {
  if (imagenes.length < 2) return imagenes;
  const tipos = FOTOS[slug];
  if (!tipos) {
    const [destacada, ...resto] = imagenes;
    return [...resto, destacada];
  }
  const mockups = new Set(tipos.mockups);
  const tablas = new Set(tipos.tablas);
  // Una imagen nueva que el archivo no conoce se trata como foto.
  const fotos = imagenes.filter((i) => !mockups.has(archivo(i)) && !tablas.has(archivo(i)));
  return [
    ...fotos,
    ...imagenes.filter((i) => mockups.has(archivo(i))),
    ...imagenes.filter((i) => tablas.has(archivo(i))),
  ];
}

/** ¿Esta imagen es un mockup? La ficha lo muestra entero en vez de recortarlo. */
export function esMockup(slug: string, imagen: string): boolean {
  const tipos = FOTOS[slug];
  const nombre = archivo(imagen);
  return !!tipos && (tipos.mockups.includes(nombre) || tipos.tablas.includes(nombre));
}

const limpiar = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Párrafos de la descripción de Woo, sin las viñetas. */
function parrafos(descripcion: string): string[] {
  return descripcion
    .split(/\n+/)
    .map(limpiar)
    .filter((p) => p && !/^[•\-–*]/.test(p));
}

/**
 * El primer párrafo que se lee como una oración. Las descripciones de Woo
 * suelen abrir con el nombre del producto en mayúsculas o con un rótulo
 * ("DETALLES:"), que se saltean. Si no hay ninguno, devuelve vacío y la ficha
 * muestra la descripción entera.
 */
export function resumen(descripcion: string): string {
  return parrafos(descripcion).find((p) => {
    if (p.length < 60 || /:$/.test(p)) return false;
    const letras = p.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, '');
    const minusculas = letras.replace(/[A-ZÁÉÍÓÚÑ]/g, '');
    return minusculas.length > letras.length * 0.6;
  }) ?? '';
}

const FIBRAS = 'algod[oó]n|poli[eé]ster|nylon|elastano|spandex|lycra|acr[ií]lico|lana|lino|viscosa|modal';

/**
 * Composición de la tela, sacada del texto libre hasta que exista como campo.
 *
 * Es estricta a propósito: solo devuelve algo cuando el texto nombra un
 * porcentaje pegado a una fibra ("100% algodón", "54% poliéster, 20% nylon").
 * Una descripción que menciona la tela sin porcentaje no muestra composición:
 * se prefiere el hueco a una frase sacada de contexto.
 */
export function composicion(descripcion: string): string | null {
  const patron = new RegExp(`(\\d{1,3})\\s?%\\s?(?:de\\s)?(${FIBRAS})(\\speinado)?`, 'gi');
  const partes: string[] = [];
  let suma = 0;
  let m: RegExpExecArray | null;
  while ((m = patron.exec(descripcion)) !== null) {
    const pct = Number(m[1]);
    if (pct < 1 || pct > 100 || suma + pct > 100) break;
    suma += pct;
    const fibra = m[2].toLowerCase().replace('algodon', 'algodón').replace('poliester', 'poliéster').replace('acrilico', 'acrílico');
    partes.push(`${pct}% ${fibra}${m[3] ? ' peinado' : ''}`);
    if (suma === 100) break;
  }
  // Una composición que no cierra en 100 quedó cortada o mal escrita.
  return suma === 100 ? partes.join(', ') : null;
}
