/**
 * Audita que las tablas de talles transcriptas en `lib/talle/moldes.ts` sigan
 * siendo las que están publicadas en Woo.
 *
 * Por qué hace falta: las guías de talles son imágenes, y el asesor de talle
 * razona sobre una transcripción a número de esas imágenes. Si se cambia una
 * tabla en Woo y no se actualiza el archivo, el asesor sigue recomendando con
 * los números viejos y **nada avisa**. Pasó una vez con la Regular: se rehizo
 * la tabla con una progresión más grande y durante un tiempo convivieron las
 * dos (una clienta vio 64/46 en el modal y 69/47 en la galería).
 *
 * Lo que sí puede detectar automáticamente: que un producto pase a apuntar a
 * una imagen que nunca se transcribió, que aparezca una tabla nueva, o que un
 * producto se quede sin tabla y caiga en el molde de respaldo por categoría.
 *
 * Lo que NO puede detectar: que **reemplacen el contenido de una imagen
 * dejando el mismo nombre de archivo**. Para eso está la columna de hash: si
 * cambia, la tabla se volvió a subir y hay que mirarla con el ojo.
 *
 *   node scripts/auditar-tablas-talles.mjs
 *   node scripts/auditar-tablas-talles.mjs --hash    (además baja las imágenes)
 *
 * Sale con código 1 si hay algo que atender, así que sirve en un cron.
 */

import { createHash } from 'node:crypto';
import { MOLDES, moldeDe } from '../lib/talle/moldes.ts';

const GRAPHQL = process.env.NEXT_PUBLIC_GRAPHQL_URL
  || 'https://lightpink-rook-704850.hostingersite.com/graphql';

const CON_HASH = process.argv.includes('--hash');

const CAMPOS = 'productCategories { nodes { name } } attributes { nodes { name options } }';

const QUERY = `query Productos($after: String) {
  products(first: 100, after: $after, where: { status: "publish" }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      name slug
      ... on VariableProduct { ${CAMPOS} }
      ... on SimpleProduct   { ${CAMPOS} }
    }
  }
}`;

async function traerProductos() {
  const todos = [];
  let after = null;
  // Tope defensivo: el catálogo ronda los 135 productos.
  for (let i = 0; i < 20; i++) {
    const r = await fetch(GRAPHQL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { after } }),
    });
    if (!r.ok) throw new Error(`GraphQL respondió ${r.status}`);
    const j = await r.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    todos.push(...j.data.products.nodes);
    if (!j.data.products.pageInfo.hasNextPage) break;
    after = j.data.products.pageInfo.endCursor;
  }
  return todos;
}

const atributo = (nodo, clave) => (nodo.attributes?.nodes ?? [])
  .find(a => (a.name || '').toLowerCase() === clave)?.options?.[0]?.trim();

const guiaDe = (nodo) => atributo(nodo, 'size-guide') || atributo(nodo, 'guia-talles');

const categoriaDe = (nodo) => (nodo.productCategories?.nodes ?? []).map(c => c.name).join(' ');

/**
 * Accesorios y talle único no llevan asesor, así que no tener tabla de medidas
 * no es un problema en ellos. El anillo es el caso claro: tiene guía de talles
 * (de aro, en milímetros), pero no es una tabla de prenda y no se transcribe.
 */
const sinAsesor = (nodo) => {
  const cat = (atributo(nodo, 'categoria') || '').toLowerCase();
  return /accesorio/.test(cat)
    || /(^|-)(cap|beanie|gorra|medias?|anillo|ring|zippo|chain|cadena|gift)(-|$)/i.test(nodo.slug);
};

async function hashDe(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return `HTTP ${r.status}`;
    const buf = Buffer.from(await r.arrayBuffer());
    return createHash('sha1').update(buf).digest('hex').slice(0, 12);
  } catch (e) {
    return `error: ${String(e.message).slice(0, 40)}`;
  }
}

const log = (...a) => console.log(...a);

const productos = await traerProductos();
log(`Catálogo: ${productos.length} productos publicados`);
log(`Moldes transcriptos: ${MOLDES.length} · nombres de archivo registrados: ${MOLDES.flatMap(m => m.guias).length}\n`);

const registradas = MOLDES.flatMap(m => m.guias.map(g => ({ guia: g, molde: m.id })));
const buscarMolde = (url) => registradas.find(r => url.toLowerCase().includes(r.guia))?.molde ?? null;

const porGuia = new Map();   // url -> productos
const sinGuia = [];          // productos sin atributo size-guide

let accesorios = 0;
for (const p of productos) {
  if (sinAsesor(p)) { accesorios++; continue; }
  const g = guiaDe(p);
  if (!g) {
    // Sin tabla propia el asesor igual resuelve, por categoría y fit. No es un
    // error, pero conviene saber a qué molde cae: un fit mal cargado manda la
    // prenda a un molde que no es el suyo y ahí sí se recomienda corrido.
    const fit = atributo(p, 'fit') || '';
    const cat = categoriaDe(p);
    sinGuia.push({ slug: p.slug, fit: fit || '—', cat: cat || '—', cae: moldeDe({ fit, category: cat })?.id ?? 'ninguno' });
    continue;
  }
  if (!porGuia.has(g)) porGuia.set(g, []);
  porGuia.get(g).push(p.slug);
}

const desconocidas = [];
const usoPorMolde = new Map(MOLDES.map(m => [m.id, 0]));

for (const [url, slugs] of porGuia) {
  const molde = buscarMolde(url);
  if (molde) usoPorMolde.set(molde, usoPorMolde.get(molde) + slugs.length);
  else desconocidas.push({ url, slugs });
}

/* ── Informe ───────────────────────────────────────────────────────────── */

log('TABLAS EN USO');
const filas = [...usoPorMolde.entries()].sort((a, b) => b[1] - a[1]);
for (const [molde, n] of filas) {
  const soloRespaldo = (MOLDES.find(m => m.id === molde)?.guias.length ?? 0) === 0;
  const marca = soloRespaldo ? '   · sin imagen propia: se usa por categoría y fit'
    : n === 0 ? '   ← ya no la usa ningún producto' : '';
  log(`  ${String(n).padStart(3)}  ${molde}${marca}`);
}
const cubiertos = filas.reduce((s, [, n]) => s + n, 0);
log(`  ---\n  ${cubiertos} productos resuelven por su tabla publicada`);
log(`  ${accesorios} accesorios y talle único quedan afuera del asesor, como corresponde\n`);

let problemas = 0;

if (desconocidas.length) {
  problemas += desconocidas.length;
  log('⚠ TABLAS SIN TRANSCRIBIR — el asesor no puede usarlas, cae al molde por categoría');
  for (const d of desconocidas) {
    log(`  ${d.url.split('/').pop()}`);
    log(`     ${d.slugs.length} producto(s): ${d.slugs.slice(0, 5).join(', ')}${d.slugs.length > 5 ? '…' : ''}`);
  }
  log('  → transcribir la imagen a lib/talle/moldes.ts y sumar el nombre de archivo a `guias`.\n');
}

if (sinGuia.length) {
  problemas += sinGuia.length;
  log('⚠ PRODUCTOS SIN GUÍA DE TALLES EN WOO — el asesor resuelve por categoría y fit');
  for (const s of sinGuia) {
    const ok = s.cae !== 'ninguno';
    log(`  ${s.slug.padEnd(34)} fit ${s.fit.padEnd(10)} → ${ok ? s.cae : 'SIN MOLDE: el asesor no se ofrece'}`);
  }
  log('  → revisar que el molde al que cae sea el correcto, y cargarles el atributo size-guide en Woo.\n');
}

// Un molde sin `guias` existe sólo para el camino de respaldo (categoría + fit),
// así que no tener productos apuntándole por imagen es lo esperado.
const huerfanos = filas.filter(([id, n]) => n === 0 && (MOLDES.find(m => m.id === id)?.guias.length ?? 0) > 0).map(([m]) => m);
if (huerfanos.length) {
  log(`· Moldes que ya no usa nadie (no es urgente): ${huerfanos.join(', ')}\n`);
}

if (CON_HASH) {
  log('HASH DE CADA IMAGEN — si cambia respecto de la corrida anterior, la tabla se volvió a subir');
  for (const m of MOLDES) {
    for (const g of m.guias) {
      const url = [...porGuia.keys()].find(u => u.toLowerCase().includes(g));
      if (!url) continue;
      log(`  ${await hashDe(url)}  ${m.id.padEnd(22)} ${url.split('/').pop()}`);
    }
  }
  log('');
}

if (problemas === 0) {
  log('✓ Todas las tablas publicadas están transcriptas y todos los productos con talle tienen la suya.');
  process.exit(0);
}
log(`${problemas} cosa(s) para atender.`);
process.exit(1);
