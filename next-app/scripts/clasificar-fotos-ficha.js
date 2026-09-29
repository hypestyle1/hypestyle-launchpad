// Clasifica las imágenes de cada producto en foto, mockup o tabla de talles,
// y escribe lib/ficha-fotos.json. La ficha de producto usa ese archivo para
// ordenar la galería: primero las fotos con persona, después los mockups (el
// del frente adelante) y al final la tabla de talles.
//
// WooCommerce no guarda qué es cada imagen, así que se mira la imagen:
//   - borde transparente                          → mockup
//   - borde claro y casi todo fondo               → tabla de talles
//   - borde claro, figura angosta y alta          → foto de estudio (persona)
//   - borde claro, cualquier otra forma           → mockup
//   - cualquier otro borde                        → foto
//
// Solo lee: no escribe nada en WordPress. Hay que correrlo cada vez que se
// publica un producto o se le cambian las fotos:
//   node scripts/clasificar-fotos-ficha.js
//
// Un producto que todavía no está en el archivo se muestra con la galería de
// Woo tal cual y la destacada al final.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GRAPHQL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://lightpink-rook-704850.hostingersite.com/graphql';
const SALIDA = path.join(__dirname, '..', 'lib', 'ficha-fotos.json');

// Correcciones a mano, por nombre de archivo, para lo que la regla no acierta.
const CORRECCIONES = {
  // Foto de estudio con los brazos abiertos: la figura queda ancha como un mockup.
  'half-zip-polo-navy': { 6: 'foto' },
};

const N = 64;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const nombre = (url) => decodeURIComponent(url.split('/').pop().split('?')[0]);

async function clasificar(buf) {
  const { data } = await sharp(buf).ensureAlpha().resize(N, N, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * N + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

  let borde = 0, transparente = 0, claro = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!(x < 3 || y < 3 || x >= N - 3 || y >= N - 3)) continue;
    const [r, g, b, a] = px(x, y);
    borde++;
    if (a < 24) { transparente++; continue; }
    if (Math.min(r, g, b) > 222 && Math.max(r, g, b) - Math.min(r, g, b) < 16) claro++;
  }
  if (transparente / borde > 0.7) return 'mockup';
  if ((transparente + claro) / borde <= 0.92) return 'foto';

  // Fondo claro: se mide cuánto ocupa la figura y qué forma tiene.
  const marco = [];
  for (let i = 0; i < N; i++) marco.push(px(i, 0), px(i, N - 1), px(0, i), px(N - 1, i));
  const mediana = (c) => marco.map((p) => p[c]).sort((a, z) => a - z)[marco.length >> 1];
  const fondo = [mediana(0), mediana(1), mediana(2)];
  let ocupados = 0, x0 = N, x1 = 0, y0 = N, y1 = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const p = px(x, y);
    const dif = Math.abs(p[0] - fondo[0]) + Math.abs(p[1] - fondo[1]) + Math.abs(p[2] - fondo[2]);
    if (dif > 36) { ocupados++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const parte = ocupados / (N * N);
  const ancho = (x1 - x0 + 1) / N;
  const alto = (y1 - y0 + 1) / N;
  if (parte < 0.10 || (parte <= 0.17 && alto >= 0.86)) return 'tabla';
  if (ancho < 0.42 && alto > 0.75) return 'foto';
  return 'mockup';
}

(async () => {
  // WPGraphQL devuelve 100 por página como máximo: hay que paginar. Los
  // productos ocultos del catálogo (siguen teniendo ficha) van en otra pasada.
  const productos = [];
  for (const filtro of ['', ', where: { visibility: HIDDEN }']) {
  let cursor = null;
  do {
    const query = `query($after: String) { products(first: 100, after: $after${filtro}) { pageInfo { hasNextPage endCursor } nodes { slug image { sourceUrl chica: sourceUrl(size: MEDIUM) } ... on Product { galleryImages(first: 40) { nodes { sourceUrl chica: sourceUrl(size: MEDIUM) } } } } } }`;
    const res = await fetch(GRAPHQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { after: cursor } }) });
    const json = await res.json();
    if (!json.data) throw new Error('GraphQL: ' + JSON.stringify(json.errors).slice(0, 300));
    for (const n of json.data.products.nodes) if (!productos.some((p) => p.slug === n.slug)) productos.push(n);
    cursor = json.data.products.pageInfo.hasNextPage ? json.data.products.pageInfo.endCursor : null;
  } while (cursor);
  }

  const salida = {};
  const cuenta = { foto: 0, mockup: 0, tabla: 0 };
  for (const p of productos) {
    const imagenes = [];
    if (p.image) imagenes.push(p.image);
    for (const g of p.galleryImages?.nodes ?? []) if (!imagenes.some((i) => i.sourceUrl === g.sourceUrl)) imagenes.push(g);

    const mockups = [], tablas = [];
    for (const [i, im] of imagenes.entries()) {
      if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(im.sourceUrl)) continue;
      let tipo = CORRECCIONES[p.slug]?.[i];
      if (!tipo) {
        // La versión chica alcanza para clasificar y no carga al servidor de WP.
        const r = await fetch(im.chica || im.sourceUrl);
        tipo = await clasificar(Buffer.from(await r.arrayBuffer()));
        await esperar(120);
      }
      cuenta[tipo]++;
      if (tipo === 'mockup') mockups.push(nombre(im.sourceUrl));
      if (tipo === 'tabla') tablas.push(nombre(im.sourceUrl));
    }
    salida[p.slug] = { mockups, tablas };
    process.stdout.write('.');
  }

  const ordenado = Object.fromEntries(Object.keys(salida).sort().map((k) => [k, salida[k]]));
  fs.writeFileSync(SALIDA, JSON.stringify(ordenado, null, 2) + '\n');
  console.log(`\n${Object.keys(ordenado).length} productos · ${cuenta.foto} fotos · ${cuenta.mockup} mockups · ${cuenta.tabla} tablas`);
  console.log('Escrito en', path.relative(process.cwd(), SALIDA));
})().catch((e) => { console.error(e); process.exit(1); });
