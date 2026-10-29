/**
 * Recomendador de talle.
 *
 * La idea: con la altura, el peso y tres preguntas de silueta estimamos las
 * medidas del cuerpo; con la tabla real de la prenda ([[moldes.ts]]) sabemos
 * cuánto mide cada talle. Comparamos las dos cosas eje por eje (pecho, largo,
 * manga) y elegimos el talle que menos se aleja del calce para el que la
 * prenda fue cortada.
 *
 * Dos cosas que no son obvias y son a propósito:
 *
 * 1. **No existe "el talle que te queda"**, existe el talle que cae como la
 *    prenda fue diseñada. Una remera boxy tiene 27 cm de holgura de pecho
 *    porque así se usa; eso no es "te queda grande". Por eso cada molde
 *    declara su `holguraPecho` y el recomendador apunta ahí, no a cero.
 *
 * 2. **Ante la duda, el más grande.** Es la regla escrita de la marca (está en
 *    políticas, en el FAQ y en la ficha): una remera un poco holgada se usa
 *    igual, una que queda chica no. Acá se aplica dos veces: quedarse corto
 *    pesa más que pasarse (`CASTIGO_CHICO`) y los empates se resuelven para
 *    arriba (`EMPATE`).
 *
 * Todo corre en el navegador y nada se manda a ningún lado.
 */

import type { Molde, FilaMolde } from './moldes';

export type Genero = 'hombre' | 'mujer';
export type Silueta = 'angosta' | 'promedio' | 'ancha';

export interface Cuerpo {
  alturaCm: number;
  pesoKg: number;
  genero: Genero;
  pecho: Silueta;
  panza: Silueta;
  cadera: Silueta;
}

export const CUERPO_INICIAL: Record<Genero, { alturaCm: number; pesoKg: number }> = {
  hombre: { alturaCm: 175, pesoKg: 75 },
  mujer: { alturaCm: 163, pesoKg: 60 },
};

export const LIMITES = {
  alturaCm: { min: 140, max: 210 },
  pesoKg: { min: 40, max: 160 },
};

/**
 * Contornos del cuerpo estimados a partir de altura y peso.
 *
 * El modelo: el torso se comporta como un cilindro, así que el contorno crece
 * con la raíz cuadrada del peso dividido la altura (el peso es volumen, el
 * contorno es la raíz de la sección). Las constantes están calibradas sobre un
 * cuerpo de referencia de cada género:
 *   - hombre 1,75 m / 72 kg → pecho 97, cintura 84, cadera 98
 *   - mujer  1,65 m / 60 kg → busto 92, cintura 74, cadera 99
 * que son los contornos que usan las tablas de talles argentinas para un M.
 */
const K: Record<Genero, { pecho: number; cintura: number; cadera: number }> = {
  hombre: { pecho: 15.12, cintura: 13.10, cadera: 15.28 },
  mujer: { pecho: 15.26, cintura: 12.27, cadera: 16.42 },
};

/** Cuánto corre cada contorno la respuesta de silueta, en cm. */
const AJUSTE_SILUETA: Record<Silueta, number> = { angosta: -4, promedio: 0, ancha: 4 };

export interface MedidasCuerpo {
  /** Contorno de pecho (o busto), en cm. */
  pecho: number;
  cintura: number;
  cadera: number;
}

export function medidasCuerpo(c: Cuerpo): MedidasCuerpo {
  const altura = clamp(c.alturaCm, LIMITES.alturaCm.min, LIMITES.alturaCm.max);
  const peso = clamp(c.pesoKg, LIMITES.pesoKg.min, LIMITES.pesoKg.max);
  const raiz = Math.sqrt(peso / (altura / 100));
  const k = K[c.genero];
  return {
    pecho: k.pecho * raiz + AJUSTE_SILUETA[c.pecho],
    cintura: k.cintura * raiz + AJUSTE_SILUETA[c.panza],
    cadera: k.cadera * raiz + AJUSTE_SILUETA[c.cadera],
  };
}

/** Qué tanto desvío (en cm) empieza a notarse en cada eje. */
const TOLERANCIA = { pecho: 5, largo: 3.5, manga: 3, cintura: 4 };

/** Cuánto pesa cada eje al elegir el talle. Se renormaliza según los que haya. */
const PESO_EJE = { pecho: 0.6, largo: 0.28, manga: 0.12, cintura: 0.6 };

/** Quedarse corto molesta más que pasarse: el castigo no es simétrico. */
const CASTIGO_CHICO = 1.35;

/**
 * Si el segundo talle queda a menos de esto del primero, gana el más grande.
 * Es chico a propósito: el grueso de la regla "ante la duda, el más grande" ya
 * lo hace `CASTIGO_CHICO`, que empuja hacia arriba a cualquier cuerpo que caiga
 * justo en el medio de dos talles. Este umbral es solo para los empates de
 * verdad; con uno más grande, un talle claramente mejor perdía contra el
 * siguiente.
 */
const EMPATE = 0.04;

export type Eje = 'pecho' | 'largo' | 'manga' | 'cintura';
export type Estado = 'justo' | 'holgado' | 'ajustado';

export interface Lectura {
  eje: Eje;
  etiqueta: string;
  estado: Estado;
  texto: string;
  /** Diferencia contra el calce buscado, en cm (positivo = más holgado). */
  desvioCm: number;
}

export interface Candidato {
  talle: string;
  puntaje: number;
  lecturas: Lectura[];
}

export interface Recomendacion {
  /** El talle recomendado. */
  talle: string;
  /** Qué tan clara es la recomendación. */
  confianza: 'alta' | 'media' | 'baja';
  /**
   * Una línea para encabezar el resultado. Nunca lleva el talle adentro: el
   * talle ya está en pantalla y una frase con el nombre pegado en el medio no
   * se puede traducir (el diccionario de `lib/i18n.ts` busca por texto exacto).
   */
  resumen: string;
  lecturas: Lectura[];
  /** Todos los talles de la tabla, en orden, para dibujar la escala. */
  escala: string[];
  /**
   * Dónde cae la persona dentro del talle elegido, de -1 (en el borde
   * ajustado) a 1 (en el borde holgado). Es lo que mueve el marcador.
   */
  posicionPecho: number;
  /** El otro talle que vale la pena mirar, si hay uno cerca. */
  alternativa?: { talle: string; tono: 'suelto' | 'al cuerpo' };
  /** Cuando el recomendado no tiene stock, el más cercano que sí. */
  sinStock?: { recomendado: string; enSuLugar: string | null };
}

const ETIQUETA: Record<Eje, string> = {
  pecho: 'Pecho',
  largo: 'Largo',
  manga: 'Manga',
  cintura: 'Cintura',
};

const ORDEN = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
const indiceTalle = (t: string) => {
  const i = ORDEN.indexOf(t.trim().toUpperCase());
  return i === -1 ? 50 : i;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Las tablas se cargan a mano y a veces un talle más grande queda más angosto
 * que el anterior (al buzo boxy le pasa: XL 64 contra L 65). No lo corregimos
 * en los datos — ahí queda lo que dice la imagen publicada —, pero tampoco
 * dejamos que el recomendador diga que subir de talle te aprieta más.
 */
function sinRetrocesos(filas: FilaMolde[], campo: 'ancho' | 'cintura'): number[] {
  let techo = -Infinity;
  return filas.map(f => {
    const v = f[campo];
    if (v === undefined) return NaN;
    techo = Math.max(techo, v);
    return techo;
  });
}

interface EjeCalculado {
  eje: Eje;
  objetivo: number;
  valores: number[];
}

function ejesDe(molde: Molde, cuerpo: Cuerpo): EjeCalculado[] {
  const cm = medidasCuerpo(cuerpo);
  const altura = clamp(cuerpo.alturaCm, LIMITES.alturaCm.min, LIMITES.alturaCm.max);
  const ejes: EjeCalculado[] = [];

  if (molde.tipo === 'arriba') {
    // La tabla da la mitad del contorno: x2 para compararlo con el cuerpo.
    ejes.push({
      eje: 'pecho',
      objetivo: cm.pecho + (molde.holguraPecho ?? 10),
      valores: sinRetrocesos(molde.filas, 'ancho').map(v => v * 2),
    });
  } else {
    ejes.push({
      eje: 'cintura',
      objetivo: cm.cintura + (molde.holguraCintura ?? 6),
      valores: sinRetrocesos(molde.filas, 'cintura').map(v => v * 2),
    });
  }

  ejes.push({
    eje: 'largo',
    objetivo: molde.coefLargo * altura,
    valores: molde.filas.map(f => f.largo ?? NaN),
  });

  if (molde.coefManga) {
    ejes.push({
      eje: 'manga',
      objetivo: molde.coefManga * altura,
      valores: molde.filas.map(f => f.manga ?? NaN),
    });
  }

  // Un eje que no cambia entre talles no ayuda a elegir (y un eje sin datos,
  // menos): se descarta antes de repartir los pesos.
  return ejes.filter(e => {
    const v = e.valores.filter(n => Number.isFinite(n));
    return v.length === molde.filas.length && Math.max(...v) - Math.min(...v) >= 1;
  });
}

/** Textos cortos a propósito: en un teléfono entran en un renglón. */
const TEXTO: Record<Eje, Record<Estado, string>> = {
  pecho: { justo: 'Justo para cómo fue cortada', holgado: 'Un toque más holgado', ajustado: 'Un toque más ajustado' },
  cintura: { justo: 'Justo para cómo fue cortada', holgado: 'Un toque más holgada', ajustado: 'Un toque más ajustada' },
  largo: { justo: 'El largo que busca la prenda', holgado: 'Un toque más largo', ajustado: 'Un toque más corto' },
  manga: { justo: 'La manga que busca la prenda', holgado: 'Manga un toque más larga', ajustado: 'Manga un toque más corta' },
};

function leer(eje: Eje, desvio: number): Lectura {
  const tol = TOLERANCIA[eje];
  const estado: Estado = Math.abs(desvio) <= tol * 0.6 ? 'justo' : desvio > 0 ? 'holgado' : 'ajustado';
  return { eje, etiqueta: ETIQUETA[eje], estado, texto: TEXTO[eje][estado], desvioCm: Math.round(desvio * 10) / 10 };
}

/**
 * El cálculo. `tallesConStock` es opcional: si se pasa, la recomendación sigue
 * siendo la misma (no mentimos por stock) pero se agrega el talle disponible
 * más cercano.
 */
export function recomendar(molde: Molde, cuerpo: Cuerpo, tallesConStock?: string[]): Recomendacion | null {
  if (!molde.filas.length) return null;
  const ejes = ejesDe(molde, cuerpo);
  const escala = molde.filas.map(f => f.talle);

  // Talle único: no hay nada que elegir, solo contamos cómo va a caer.
  if (molde.filas.length === 1 || !ejes.length) {
    const lecturas = ejes.map(e => leer(e.eje, e.valores[0] - e.objetivo));
    return {
      talle: escala[0],
      confianza: ejes.length ? 'media' : 'baja',
      resumen: 'Esta prenda viene en un solo talle',
      lecturas,
      escala,
      posicionPecho: 0,
      sinStock: tallesConStock && !tallesConStock.includes(escala[0]) ? { recomendado: escala[0], enSuLugar: null } : undefined,
    };
  }

  const pesoTotal = ejes.reduce((s, e) => s + PESO_EJE[e.eje], 0);

  const candidatos: Candidato[] = molde.filas.map((fila, i) => {
    let puntaje = 0;
    const lecturas: Lectura[] = [];
    for (const e of ejes) {
      const desvio = e.valores[i] - e.objetivo;
      const unidades = desvio / TOLERANCIA[e.eje];
      const castigo = desvio < 0 ? CASTIGO_CHICO : 1;
      puntaje += (PESO_EJE[e.eje] / pesoTotal) * (unidades * castigo) ** 2;
      lecturas.push(leer(e.eje, desvio));
    }
    return { talle: fila.talle, puntaje, lecturas };
  });

  const ordenados = [...candidatos].sort((a, b) => a.puntaje - b.puntaje || indiceTalle(a.talle) - indiceTalle(b.talle));
  let mejor = ordenados[0];
  const segundo = ordenados[1];

  // Ante la duda, el más grande.
  if (segundo && segundo.puntaje - mejor.puntaje <= EMPATE && indiceTalle(segundo.talle) > indiceTalle(mejor.talle)) {
    mejor = segundo;
  }

  const otro = ordenados.find(c => c.talle !== mejor.talle);
  const confianza: Recomendacion['confianza'] =
    mejor.puntaje < 0.45 && otro && otro.puntaje - mejor.puntaje > 0.35
      ? 'alta'
      : mejor.puntaje < 1.4
        ? 'media'
        : 'baja';

  const ejePrincipal = molde.tipo === 'arriba' ? 'pecho' : 'cintura';
  const lecturaPrincipal = mejor.lecturas.find(l => l.eje === ejePrincipal);
  const posicionPecho = lecturaPrincipal
    ? clamp(lecturaPrincipal.desvioCm / (TOLERANCIA[ejePrincipal] * 2), -1, 1)
    : 0;

  const resumen =
    confianza === 'alta'
      ? 'Es el que mejor te va a caer'
      : confianza === 'media'
        ? 'Es el que te recomendamos'
        : 'Estás justo entre dos talles: este es el más cercano';

  let alternativa: Recomendacion['alternativa'];
  if (otro && otro.puntaje - mejor.puntaje < 0.6) {
    alternativa = {
      talle: otro.talle,
      tono: indiceTalle(otro.talle) > indiceTalle(mejor.talle) ? 'suelto' : 'al cuerpo',
    };
  }

  let sinStock: Recomendacion['sinStock'];
  if (tallesConStock && !tallesConStock.includes(mejor.talle)) {
    const cercano = [...candidatos]
      .filter(c => tallesConStock.includes(c.talle))
      .sort((a, b) => a.puntaje - b.puntaje || indiceTalle(b.talle) - indiceTalle(a.talle))[0];
    sinStock = { recomendado: mejor.talle, enSuLugar: cercano?.talle ?? null };
  }

  return { talle: mejor.talle, confianza, resumen, lecturas: mejor.lecturas, escala, posicionPecho, alternativa, sinStock };
}

/** Solo el talle, para la vista previa en vivo del primer paso. */
export function talleEstimado(molde: Molde, cuerpo: Cuerpo): string | null {
  return recomendar(molde, cuerpo)?.talle ?? null;
}

/* ─── Unidades ─────────────────────────────────────────────────────────── */

export const cmAPiesPulgadas = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { pies: Math.floor(total / 12), pulgadas: total % 12 };
};

export const piesPulgadasACm = (pies: number, pulgadas: number) => Math.round((pies * 12 + pulgadas) * 2.54);

export const kgALb = (kg: number) => Math.round(kg * 2.20462);

export const lbAKg = (lb: number) => Math.round(lb / 2.20462);
