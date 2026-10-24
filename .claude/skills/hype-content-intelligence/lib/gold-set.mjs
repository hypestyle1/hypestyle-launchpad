/**
 * Gold set B4: medición del acuerdo entre la clasificación asistida y las
 * decisiones humanas de referencia.
 *
 * El gold set son 30 publicaciones que clasificó Valentín **antes** de que el
 * modelo viera nada (doc 17). Sin él, "la IA clasificó bien" es una opinión;
 * con él es un número por dimensión.
 *
 * Reglas que este módulo hace cumplir, y que son el punto de todo:
 *
 *  1. **Ninguna etiqueta puede salir del vocabulario congelado.** Si la corrida
 *     inventó un valor, no se calcula un acuerdo "casi bien": se rechaza. Una
 *     etiqueta inventada es un error de la corrida, no un empate.
 *  2. **Las dos partes tienen que declarar la misma versión de taxonomía.** Un
 *     gold set v1 no mide una corrida v2.
 *  3. **El gold set tiene que estar completo.** Medir contra 11 decisiones de 30
 *     da un número que parece una métrica y no lo es.
 *  4. **Sin veredicto automático de despliegue.** Esto devuelve el acuerdo por
 *     dimensión y las confusiones; qué hacer con una dimensión que no llega al
 *     umbral (ajustar el prompt, o fusionar valores del vocabulario) lo decide
 *     una persona.
 *
 * Uso:
 *   node lib/gold-set.mjs <gold-set-b4-v1.json> <corrida.json>
 */

import { readFileSync } from 'node:fs';

import { TAXONOMY_VERSION, VOCABULARIO } from './analisis.mjs';

/** Umbrales de acuerdo por dimensión (doc 17 §6), con su por qué. */
export const UMBRALES = {
  coverType: { umbral: 0.85, porque: 'es la dimensión de la pregunta fundante' },
  category: { umbral: 0.85, porque: 'manda la mezcla editorial' },
  hasModels: { umbral: 0.9, porque: 'es casi objetivo' },
  scenario: { umbral: 0.75, porque: 'hay ambigüedad legítima' },
  visualStyle: { umbral: 0.75, porque: 'es el más subjetivo' },
};

export const DIMENSIONES = Object.keys(UMBRALES);

/** Total del gold set según el diseño (doc 17 §2). */
export const TAMANO_GOLD_SET = 30;

class ErrorDeMedicion extends Error {}

const etiquetaDe = (fila, dim) => {
  const v = fila?.etiquetas?.[dim] ?? fila?.[dim] ?? null;
  return v == null || v === '' ? null : String(v);
};

const idDe = (fila) => String(fila?.igMediaId ?? fila?.id ?? fila?.ig_media_id ?? '');

/**
 * Valida un lado de la comparación. Devuelve el mapa id → etiquetas.
 * Lanza si hay una etiqueta fuera del vocabulario congelado.
 */
export function indexar(filas, { lado, exigirCompleto = false } = {}) {
  if (!Array.isArray(filas)) throw new ErrorDeMedicion(`${lado}: se esperaba una lista de publicaciones`);
  const mapa = new Map();

  for (const fila of filas) {
    const id = idDe(fila);
    if (!id) throw new ErrorDeMedicion(`${lado}: hay una fila sin id de publicación`);
    if (mapa.has(id)) throw new ErrorDeMedicion(`${lado}: la publicación ${id} está dos veces`);

    const etiquetas = {};
    for (const dim of DIMENSIONES) {
      const v = etiquetaDe(fila, dim);
      if (v != null && !VOCABULARIO[dim].includes(v)) {
        // Esto es el punto 1: no se mide, se rechaza.
        throw new ErrorDeMedicion(
          `${lado}: la publicación ${id} tiene "${v}" en ${dim}, que no existe en la taxonomía ` +
            `v${TAXONOMY_VERSION}. Valores válidos: ${VOCABULARIO[dim].join(' · ')}`,
        );
      }
      etiquetas[dim] = v;
    }
    if (exigirCompleto) {
      const faltan = DIMENSIONES.filter((d) => etiquetas[d] == null);
      if (faltan.length) {
        throw new ErrorDeMedicion(
          `${lado}: la publicación ${id} está sin terminar (falta ${faltan.join(', ')}). ` +
            'Un gold set incompleto no mide: completá las 30 y volvé a exportar.',
        );
      }
    }
    mapa.set(id, etiquetas);
  }
  return mapa;
}

/**
 * Acuerdo por dimensión entre el gold set y una corrida de clasificación.
 *
 * @param gold  export del gold set: { taxonomiaVersion, posts: [...] }
 * @param run   corrida: { taxonomyVersion, posts: [...] } o una lista de publicaciones
 */
export function medirAcuerdo(gold, run) {
  const goldPosts = Array.isArray(gold) ? gold : (gold?.posts ?? gold?.rows ?? []);
  const runPosts = Array.isArray(run) ? run : (run?.posts ?? run?.rows ?? []);

  // Punto 2: las versiones tienen que coincidir, y con la congelada.
  const vGold = Array.isArray(gold) ? TAXONOMY_VERSION : (gold?.taxonomiaVersion ?? gold?.taxonomyVersion);
  const vRun = Array.isArray(run) ? TAXONOMY_VERSION : (run?.taxonomiaVersion ?? run?.taxonomyVersion);
  if (vGold != null && vGold !== TAXONOMY_VERSION) {
    throw new ErrorDeMedicion(
      `el gold set declara taxonomía v${vGold} y la congelada es la v${TAXONOMY_VERSION}: ` +
        'hace falta un gold set nuevo, no una conversión.',
    );
  }
  if (vRun != null && vRun !== TAXONOMY_VERSION) {
    throw new ErrorDeMedicion(
      `la corrida declara taxonomía v${vRun} y la congelada es la v${TAXONOMY_VERSION}.`,
    );
  }

  const g = indexar(goldPosts, { lado: 'gold set', exigirCompleto: true });
  const r = indexar(runPosts, { lado: 'corrida' });

  // Punto 3: el gold set tiene que estar completo.
  const incompleto = g.size < TAMANO_GOLD_SET;

  const comunes = [...g.keys()].filter((id) => r.has(id));
  const sinClasificar = [...g.keys()].filter((id) => !r.has(id));
  const fueraDelGoldSet = [...r.keys()].filter((id) => !g.has(id));

  const dimensiones = DIMENSIONES.map((dim) => {
    const { umbral, porque } = UMBRALES[dim];
    const pares = comunes
      .map((id) => ({ id, esperado: g.get(id)[dim], obtenido: r.get(id)[dim] }))
      .filter((p) => p.obtenido != null); // lo que la corrida no decidió no es un desacuerdo

    const aciertos = pares.filter((p) => p.esperado === p.obtenido);
    const errores = pares.filter((p) => p.esperado !== p.obtenido);

    // Confusiones: qué par se mezcla con qué par, de mayor a menor.
    const cuenta = new Map();
    for (const e of errores) {
      const k = `${e.esperado} → ${e.obtenido}`;
      cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
    }
    const confusiones = [...cuenta.entries()]
      .map(([par, n]) => ({ par, n }))
      .sort((a, b) => b.n - a.n);

    const acuerdo = pares.length > 0 ? aciertos.length / pares.length : null;
    return {
      dimension: dim,
      n: pares.length,
      aciertos: aciertos.length,
      acuerdo,
      umbral,
      porque,
      pasa: acuerdo != null ? acuerdo >= umbral : null,
      sinDecidir: comunes.length - pares.length,
      confusiones,
      errores: errores.map((e) => ({ id: e.id, esperado: e.esperado, obtenido: e.obtenido })),
    };
  });

  const medibles = dimensiones.filter((d) => d.pasa != null);
  const noLlegan = medibles.filter((d) => !d.pasa).map((d) => d.dimension);

  return {
    taxonomiaVersion: TAXONOMY_VERSION,
    goldSet: { total: g.size, esperado: TAMANO_GOLD_SET, incompleto },
    comparadas: comunes.length,
    sinClasificar,
    fueraDelGoldSet,
    dimensiones,
    noLlegan,
    /** Punto 4: esto NO es un GO. Es el insumo de una decisión humana. */
    listoParaDecidir: !incompleto && medibles.length === DIMENSIONES.length,
  };
}

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

export function informe(res) {
  const out = [`\nAcuerdo contra el gold set — taxonomía v${res.taxonomiaVersion}`];
  out.push(
    `Gold set: ${res.goldSet.total} de ${res.goldSet.esperado} publicaciones` +
      (res.goldSet.incompleto ? '  ⚠ INCOMPLETO: el número de abajo no es una métrica' : ''),
  );
  out.push(`Comparadas: ${res.comparadas}`);
  if (res.sinClasificar.length) out.push(`Sin clasificar por la corrida: ${res.sinClasificar.length}`);
  if (res.fueraDelGoldSet.length) out.push(`En la corrida pero fuera del gold set: ${res.fueraDelGoldSet.length}`);
  out.push('');

  for (const d of res.dimensiones) {
    const marca = d.pasa == null ? '  ' : d.pasa ? '✓ ' : '✗ ';
    out.push(
      `${marca}${d.dimension.padEnd(12)} ${pct(d.acuerdo).padStart(6)}  ` +
        `(${d.aciertos}/${d.n})  umbral ${pct(d.umbral)} — ${d.porque}`,
    );
    for (const c of d.confusiones.slice(0, 3)) out.push(`      confunde ${c.par} ×${c.n}`);
    if (d.sinDecidir) out.push(`      ${d.sinDecidir} sin decidir por la corrida (no cuentan)`);
  }

  out.push('');
  if (res.noLlegan.length) {
    out.push(
      `No llegan al umbral: ${res.noLlegan.join(', ')}. Dos salidas honestas: ajustar el prompt y ` +
        'volver a medir, o fusionar valores del vocabulario hasta que la distinción sea estable ' +
        '(y entonces es una taxonomía v2, con gold set nuevo).',
    );
  } else {
    out.push('Todas las dimensiones llegan a su umbral.');
  }
  out.push('Esto no autoriza la clasificación masiva: es el insumo de esa decisión.');
  return out.join('\n');
}

/* ─── CLI ───────────────────────────────────────────────────────────────── */

const esMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (esMain) {
  const [gold, corrida] = process.argv.slice(2);
  if (!gold || !corrida) {
    console.error('Uso: node lib/gold-set.mjs <gold-set-b4-v1.json> <corrida.json>');
    process.exit(2);
  }
  try {
    const res = medirAcuerdo(
      JSON.parse(readFileSync(gold, 'utf8')),
      JSON.parse(readFileSync(corrida, 'utf8')),
    );
    console.log(informe(res));
    process.exit(0);
  } catch (e) {
    console.error(`\nNo se pudo medir: ${e.message}\n`);
    process.exit(1);
  }
}
