// Importa al panel las postulaciones del Google Form que usábamos antes.
//
// Se corre UNA vez, a mano:
//   node scripts/importar-creadores-google-form.js --dry     (no escribe nada)
//   node scripts/importar-creadores-google-form.js --escribir
//
// Escribe directo contra WordPress y NO pasa por /api/creadores a propósito:
// esa ruta le manda un aviso a la content manager y dispara una traducción por
// cada postulación. Importar 130 mandaría 130 mails.
//
// Dos cosas del formulario viejo obligan a normalizar bastante:
//   - Nunca pidió el mail. De las 130, ninguna lo tiene: se identifican por su
//     arroba de Instagram (ver hypestyle_creadores_create en el mu-plugin).
//   - Todo venía en texto libre: la edad como "18 años", el talle como
//     "SEGUN CORTE M/L", y el @ de Instagram y el de TikTok mezclados en un
//     solo campo.

const fs = require('fs');
const path = require('path');

const CSV = 'C:/Users/pc/Documents/Hypestyle/NUEVAS IMPLEMENTACIONES/CREA CONTENIDO CON HYPE/CREA CONTENIDO CON HYPESTYLE.csv';
const ESCRIBIR = process.argv.includes('--escribir');

/* ─── Entorno ────────────────────────────────────────────────────────────── */

function leerEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

/* ─── CSV ────────────────────────────────────────────────────────────────── */

function parseCsv(t) {
  const rows = [];
  let f = '', row = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/* ─── Normalizadores ─────────────────────────────────────────────────────── */

// "18 años" -> "18". Se descartan valores imposibles en vez de guardar basura.
function edad(v) {
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 10 && n <= 90 ? String(n) : '';
}

// El talle venía libre: "S/M", "36", "SEGUN CORTE M/L", "USO TALLE S.".
// Se queda con el primer talle reconocible; si no hay ninguno, vacío.
function talle(v) {
  const t = String(v).toUpperCase();
  for (const cand of ['XL', 'L', 'M', 'S']) {
    if (new RegExp(`(^|[^A-Z])${cand}([^A-Z]|$)`).test(t)) return cand;
  }
  return '';
}

// Un solo campo traía las dos cuentas, y la gente lo llenó de todas las formas
// posibles: "@juan", "ig: juan tt: juanok", "Insta: Juan. TikTok: juanok",
// "juan y juanok", "Chiaricabona en las dos redes". Los primeros 28 intentos de
// importación se perdían por no contemplar las variantes sin arroba.
const HANDLE = '[A-Za-z0-9._]{2,30}';

function limpiarHandle(h) {
  return String(h || '').replace(/^@/, '').replace(/[.,;/]+$/, '').trim();
}

function cuentas(v) {
  const texto = String(v || '').trim();
  if (!texto) return { instagram: '', tiktok: '' };

  // Las arrobas sueltas, que sirven para rellenar lo que la etiqueta no cubra.
  const sueltas = [...texto.matchAll(new RegExp('@\\s*(' + HANDLE + ')', 'g'))].map(m => limpiarHandle(m[1]));

  // 0) URL de TikTok: "www.tiktok.com/@usuario"
  const mUrlTk = texto.match(new RegExp('tiktok\\.com\\/@?(' + HANDLE + ')', 'i'));

  // 1) Con etiqueta: "ig:", "insta:", "instagram:", "tt:", "tiktok:", "tik tok:"
  const mIg = texto.match(new RegExp('(?:instagram|insta|ig)\\s*[:\\-]?\\s+@?(' + HANDLE + ')', 'i'));
  const mTk = texto.match(new RegExp('(?:tik\\s*tok|tiktok|tt)\\s*[:\\-]?\\s*@?(' + HANDLE + ')', 'i'));

  // "ig y tiktok: @x" — una sola cuenta para las dos redes.
  const mIgYTk = texto.match(new RegExp('(?:ig|insta\\w*)\\s*y\\s*(?:tik\\s*tok|tiktok|tt)\\s*[:\\-]?\\s*@?(' + HANDLE + ')', 'i'));
  if (mIgYTk) {
    const h = limpiarHandle(mIgYTk[1]);
    return { instagram: h, tiktok: h };
  }

  if (mIg || mTk || mUrlTk) {
    let ig = limpiarHandle(mIg && mIg[1]);
    let tk = limpiarHandle((mTk && mTk[1]) || (mUrlTk && mUrlTk[1]));
    // Si una quedó vacía, se toma la primera arroba que no sea la otra.
    if (!ig) ig = sueltas.find(h => h !== tk) || '';
    if (!tk) tk = sueltas.find(h => h !== ig) || '';
    if (ig || tk) return { instagram: ig, tiktok: tk };
  }

  // 2) "X en las dos redes" / "X en ambas": el mismo usuario para las dos.
  const mAmbas = texto.match(new RegExp('@?(' + HANDLE + ')\\s+en\\s+(?:las\\s+dos|ambas)', 'i'));
  if (mAmbas) {
    const h = limpiarHandle(mAmbas[1]);
    return { instagram: h, tiktok: h };
  }

  // 3) Arrobas explícitas.
  const arrobas = [...texto.matchAll(new RegExp('@\\s*(' + HANDLE + ')', 'g'))].map(m => limpiarHandle(m[1]));
  if (arrobas.length >= 2) return { instagram: arrobas[0], tiktok: arrobas[1] };
  if (arrobas.length === 1) {
    const soloTk = /tik\s*tok|tiktok/i.test(texto) && !/insta|ig\b/i.test(texto);
    return soloTk ? { instagram: '', tiktok: arrobas[0] } : { instagram: arrobas[0], tiktok: '' };
  }

  // 4) Sin arroba ni etiqueta. La gente usó de todo como separador:
  //    "juan y juanok", "a / b", "a - b", "a and b", y hasta un espacio pelado.
  //    Se filtran las palabras comunes para no confundir una frase con un
  //    usuario ("mi instagram es juan" no puede dar instagram = "mi").
  const PALABRAS = /^(y|and|o|or|redes|ambas|las|dos|en|mi|es|soy|el|la|de|both|tengo|solo)$/i;
  const trozos = texto
    .split(/\s*(?:\/|,|;|\by\b|\band\b|\+|\||-)\s*|\s+/i)
    .map(limpiarHandle)
    .filter(t => new RegExp('^' + HANDLE + '$').test(t) && !PALABRAS.test(t));

  if (trozos.length >= 2) return { instagram: trozos[0], tiktok: trozos[1] };
  if (trozos.length === 1) return { instagram: trozos[0], tiktok: '' };
  return { instagram: '', tiktok: '' };
}

// "2026/03/02 10:20:01 p.m. GMT-3" -> ISO. Si no se entiende, queda vacío y
// la postulación figura con la fecha de importación, que es lo honesto.
function fecha(v) {
  const m = String(v).match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*([ap])\.?\s*m/i);
  if (!m) return '';
  let h = parseInt(m[4], 10);
  if (/p/i.test(m[7]) && h !== 12) h += 12;
  if (/a/i.test(m[7]) && h === 12) h = 0;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], h + 3, +m[5], +m[6])); // GMT-3
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/* ─── Main ───────────────────────────────────────────────────────────────── */

(async () => {
  const env = leerEnv();
  const WP = env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
  const SECRET = (env.WP_SECRET || '').replace(/^\ufeff/, '').trim();
  if (!SECRET) { console.log('falta WP_SECRET en .env.local'); process.exit(1); }

  const rows = parseCsv(fs.readFileSync(CSV, 'utf8').replace(/^\ufeff/, '')).filter(r => r.some(c => c.trim()));
  const datos = rows.slice(1);

  const listos = [];
  const salteados = [];

  for (const r of datos) {
    const nombre = (r[1] || '').trim();
    const { instagram, tiktok } = cuentas(r[5]);
    // Sin nombre o sin ninguna cuenta no hay a quién atribuirle la postulación
    // ni forma de contactarlo. Se saltea en vez de crear un registro huérfano.
    if (!nombre || (!instagram && !tiktok)) { salteados.push({ nombre, motivo: 'sin nombre o sin cuenta' }); continue; }

    listos.push({
      nombre,
      instagram, tiktok,
      email: '',
      edad: edad(r[2]),
      ciudad: (r[3] || '').trim(),
      plataforma: (r[4] || '').trim(),
      seguidores: (r[6] || '').trim(),
      porque: (r[7] || '').trim(),
      marcas: (r[8] || '').trim(),
      talle: talle(r[9]),
      origen: 'google-form',
      postulado_el: fecha(r[0]),
      idioma: 'ES',
      traduccion_estado: 'no_hace_falta',
    });
  }

  console.log(`postulaciones en el CSV: ${datos.length}`);
  console.log(`importables:             ${listos.length}`);
  console.log(`salteadas:               ${salteados.length}`);

  const conTalle = listos.filter(x => x.talle).length;
  const conEdad = listos.filter(x => x.edad).length;
  const conTikTok = listos.filter(x => x.tiktok).length;
  const conFecha = listos.filter(x => x.postulado_el).length;
  const menores = listos.filter(x => x.edad && +x.edad < 18).length;
  console.log('');
  console.log(`  con arroba de TikTok:  ${conTikTok}`);
  console.log(`  con edad legible:      ${conEdad}  (menores de 18: ${menores})`);
  console.log(`  con talle reconocible: ${conTalle}`);
  console.log(`  con fecha original:    ${conFecha}`);

  console.log('\n=== muestra de 3 ===');
  listos.slice(0, 3).forEach(x => {
    console.log(`  ${x.nombre} | @${x.instagram}${x.tiktok ? ' | tiktok @' + x.tiktok : ''} | ${x.edad || '?'} | ${x.ciudad} | talle ${x.talle || '?'}`);
    console.log(`     ${x.postulado_el || '(sin fecha)'} — "${x.porque.slice(0, 70)}..."`);
  });

  if (salteados.length) {
    console.log('\n=== salteadas ===');
    salteados.forEach(s => console.log(`  ${s.nombre || '(sin nombre)'} — ${s.motivo}`));
  }

  if (!ESCRIBIR) {
    console.log('\nENSAYO. Nada se escribió. Para importar de verdad: --escribir');
    return;
  }

  console.log('\nimportando...');
  let ok = 0, fallaron = 0;
  for (const c of listos) {
    const res = await fetch(`${WP}/wp-json/hypestyle/v1/creadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify(c),
    });
    if (res.ok) ok++;
    else { fallaron++; console.log(`  falló ${c.nombre}: ${res.status} ${(await res.text()).slice(0, 90)}`); }
    // Sin pausa, WordPress empieza a devolver 500 — ya pasó con las consultas
    // de pedidos del panel de mayoristas.
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`\nimportadas: ${ok} | fallaron: ${fallaron}`);
})();
