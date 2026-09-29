/**
 * Variantes de la página de producto (prueba en local, 29/09/2026).
 *
 * Tres diseños para comparar contra la ficha actual, elegibles con
 * `?ficha=a|b|c` en la URL. Sin el parámetro la ficha es la de siempre.
 *
 *  a — tres columnas: info · foto de modelo · compra
 *  b — la grilla actual con los bloques que faltaban (pago, calce, cuándo llega)
 *  c — ficha larga: galería en grilla y secciones debajo
 */
export type FichaVariante = 'a' | 'b' | 'c';

export const FICHA_VARIANTES: { id: FichaVariante; nombre: string }[] = [
  { id: 'a', nombre: 'Tres columnas' },
  { id: 'b', nombre: 'Actual reforzada' },
  { id: 'c', nombre: 'Ficha larga' },
];

const CLAVE_SESION = 'hype_ficha_variante';

/**
 * Lee la variante de la URL y la recuerda durante la sesión, para que al pasar
 * de un producto a otro no haya que volver a escribir el parámetro.
 * `?ficha=actual` (o cualquier valor que no sea a/b/c) vuelve a la de siempre.
 */
export function leerVariante(): FichaVariante | null {
  if (typeof window === 'undefined') return null;
  const valida = (v: string | null): v is FichaVariante => v === 'a' || v === 'b' || v === 'c';
  const deUrl = new URLSearchParams(window.location.search).get('ficha');
  try {
    if (deUrl !== null) {
      if (valida(deUrl)) sessionStorage.setItem(CLAVE_SESION, deUrl);
      else sessionStorage.removeItem(CLAVE_SESION);
      return valida(deUrl) ? deUrl : null;
    }
    const guardada = sessionStorage.getItem(CLAVE_SESION);
    return valida(guardada) ? guardada : null;
  } catch {
    return valida(deUrl) ? deUrl : null;
  }
}

/**
 * A CONFIRMAR con Valentín: horas hábiles entre el pago confirmado y la entrega
 * del paquete a Andreani. 48 es un valor de ejemplo para poder ver el bloque.
 */
export const DESPACHO_HORAS_HABILES = 48;

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

/**
 * La destacada de Woo es siempre el mockup. Las variantes A y C abren con una
 * persona usando la prenda, así que el mockup pasa al final.
 */
export function modeloPrimero(imagenes: string[]): string[] {
  if (imagenes.length < 2) return imagenes;
  const [mockup, ...resto] = imagenes;
  return [...resto, mockup];
}

const limpiar = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Párrafos de la descripción de Woo, sin las viñetas. */
function parrafos(descripcion: string): string[] {
  return descripcion
    .split(/\n+/)
    .map(limpiar)
    .filter((p) => p && !/^[•\-–*]/.test(p));
}

/** Las viñetas ("• Cierres YKK reforzados") de la descripción. */
export function vinetas(descripcion: string): string[] {
  return descripcion
    .split(/\n+/)
    .map(limpiar)
    .filter((p) => /^[•\-–*]\s*\S/.test(p))
    .map((p) => p.replace(/^[•\-–*]\s*/, ''));
}

/**
 * El primer párrafo con contenido: muchas descripciones abren con el nombre del
 * producto en mayúsculas en una línea sola, que se saltea.
 */
export function resumen(descripcion: string): string {
  const ps = parrafos(descripcion);
  return ps.find((p) => p.length > 60) ?? ps[0] ?? '';
}

/**
 * Composición de la tela, sacada del texto libre hasta que exista como campo.
 * Busca la primera oración que nombre un porcentaje o una fibra.
 */
export function composicion(descripcion: string): string | null {
  // Sin lookbehind: Safari viejo lo rechaza al parsear y rompe todo el bundle.
  const oraciones = descripcion
    .split(/\n+/)
    .flatMap((linea) => linea.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((o) => limpiar(o).replace(/^[•\-–*]\s*/, ''))
    .filter(Boolean);
  const conPorcentaje = oraciones.find((o) => /\d{2,3}\s?%/.test(o) && /algod|poli|lana|nylon|acr|elast|lino|viscosa/i.test(o));
  const candidata = conPorcentaje ?? oraciones.find((o) => /algod[oó]n|poli[eé]ster|gabardina|r[uú]stico|frisa|jersey|waffle/i.test(o));
  if (!candidata) return null;
  if (candidata.length <= 120) return candidata.replace(/[.]$/, '');
  // Oración larga: se queda con el tramo que nombra la tela ("rústico premium 100% algodón").
  const tramo = candidata.match(/(?:[a-záéíóúñ]+\s){0,3}\d{2,3}\s?%\s?(?:de\s)?[a-záéíóúñ]+/i);
  if (!tramo) return null;
  const texto = tramo[0].replace(/^(?:en|con|de|y)\s/i, '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
