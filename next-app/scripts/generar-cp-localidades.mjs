// Genera data/cp-localidades.json: código postal argentino (4 dígitos) →
// [ciudad cabecera, provincia], para autocompletar ciudad y provincia en el
// checkout a partir del CP. Los campos quedan visibles y editables: esto es
// un prellenado, no una verdad absoluta.
//
// Fuente: listado de localidades del Correo Argentino (CSV `id;cp;localidad;idProvincia`,
// https://gist.github.com/lucsh/cb55fbcb4ff291c0368b7f43730cdd94). El listado es a
// nivel barrio/estafeta, así que la ciudad cabecera se deduce por votos:
//   - "X Estafeta/Sucursal N°..." → X es la cabecera (señal fuerte)
//   - "Barrio Z (X, Pdo. Y)" / "(X-Dpto. Y)" → X es la cabecera (señal media)
//   - un nombre pelado sin paréntesis vota por sí mismo (señal débil)
// Si ningún nombre junta votos, el CP queda solo con provincia (ciudad vacía).
//
// En CABA la "ciudad" del checkout es el BARRIO: sale de scripts/cp-barrios-caba.json,
// un mapa CP → barrio mayoritario generado cruzando los CPAs georreferenciados de
// OpenDataCordoba/codigo-postal-argentino contra los polígonos de barrios del GCBA
// (barrios.geojson de datosabiertos). Los CPs repartidos entre barrios sin mayoría
// quedan vacíos: mejor no prellenar que prellenar mal.
//
// Uso: node scripts/generar-cp-localidades.mjs <ruta-al-csv>

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Uso: node scripts/generar-cp-localidades.mjs <localidades.csv>');
  process.exit(1);
}

const BARRIOS_CABA = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'cp-barrios-caba.json'), 'utf8'),
);

// Mismos nombres (con tildes) que el select de provincia del checkout.
// El CSV usa ids 1-24 en orden alfabético con CABA al final.
const PROVINCIAS = {
  1: 'Buenos Aires', 2: 'Catamarca', 3: 'Chaco', 4: 'Chubut', 5: 'Córdoba',
  6: 'Corrientes', 7: 'Entre Ríos', 8: 'Formosa', 9: 'Jujuy', 10: 'La Pampa',
  11: 'La Rioja', 12: 'Mendoza', 13: 'Misiones', 14: 'Neuquén', 15: 'Río Negro',
  16: 'Salta', 17: 'San Juan', 18: 'San Luis', 19: 'Santa Cruz', 20: 'Santa Fe',
  21: 'Santiago del Estero', 22: 'Tierra del Fuego', 23: 'Tucumán', 24: 'CABA',
};

// El CSV viene sin tildes ("Moron", "Parana"). Se reponen por palabra.
const TILDES = {
  Moron: 'Morón', Lanus: 'Lanús', Parana: 'Paraná', Lujan: 'Luján', Bahia: 'Bahía',
  Tucuman: 'Tucumán', Cordoba: 'Córdoba', Rio: 'Río', Martin: 'Martín', Jose: 'José',
  Maria: 'María', Joaquin: 'Joaquín', Agustin: 'Agustín', Belen: 'Belén', Nuñez: 'Núñez',
  Concepcion: 'Concepción', Union: 'Unión', Constitucion: 'Constitución', Almiron: 'Almirón',
  Anatuya: 'Añatuya', Neuquen: 'Neuquén', Ramirez: 'Ramírez', Guemes: 'Güemes',
  Hernandez: 'Hernández', Fernandez: 'Fernández', Gonzalez: 'González', Rodriguez: 'Rodríguez',
  Ituzaingo: 'Ituzaingó', Olavarria: 'Olavarría', Nicolas: 'Nicolás',
};

/** "Mar Del Plata" → "Mar del Plata": conectores en minúscula y tildes repuestas. */
function prolijo(nombre) {
  return nombre
    .split(' ')
    .map((w, i) => {
      const conTilde = TILDES[w] ?? w;
      return i > 0 && /^(De|Del|La|Las|Los|El|Y|E)$/i.test(conTilde) ? conTilde.toLowerCase() : conTilde;
    })
    .join(' ');
}

// Capitales y ciudades grandes donde el listado no deja deducir la cabecera
// (todas sus filas son barrios): se fijan a mano. Solo pisan la ciudad; la
// provincia sale igual del listado.
const CABECERAS = {
  '5500': 'Mendoza', '8300': 'Neuquén', '5400': 'San Juan', '9410': 'Ushuaia',
  '9420': 'Río Grande', '2600': 'Venado Tuerto', '3000': 'Santa Fe', '4000': 'San Miguel de Tucumán',
  '3400': 'Corrientes', '3500': 'Resistencia', '4200': 'Santiago del Estero',
  '4700': 'San Fernando del Valle de Catamarca', '5300': 'La Rioja', '5700': 'San Luis',
  '6300': 'Santa Rosa', '9000': 'Comodoro Rivadavia', '9100': 'Trelew', '9103': 'Rawson',
  '9400': 'Río Gallegos', '4600': 'San Salvador de Jujuy', '3600': 'Formosa', '1870': 'Avellaneda',
};

const porCp = new Map();
for (const linea of readFileSync(csvPath, 'latin1').split(/\r?\n/)) {
  const partes = linea.split(';');
  if (partes.length !== 4) continue; // encabezado o fila rota
  const cp = partes[1].trim();
  const localidad = partes[2].trim();
  const idProv = Number(partes[3]);
  if (!/^\d{4}$/.test(cp) || !PROVINCIAS[idProv] || !localidad) continue;
  if (!porCp.has(cp)) porCp.set(cp, []);
  porCp.get(cp).push({ localidad, idProv });
}

const salida = {};
let conCiudad = 0;

for (const [cp, filas] of porCp) {
  // Provincia: la mayoritaria entre las filas del CP.
  const provVotos = new Map();
  for (const f of filas) provVotos.set(f.idProv, (provVotos.get(f.idProv) ?? 0) + 1);
  const idProv = [...provVotos.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const provincia = PROVINCIAS[idProv];

  if (idProv === 24) {
    const barrio = BARRIOS_CABA[cp] ?? '';
    salida[cp] = [barrio, 'CABA'];
    if (barrio) conCiudad++;
    continue;
  }

  const votos = new Map();
  const sumar = (nombre, peso) => {
    const n = nombre.trim();
    if (!n || /^barrio\b/i.test(n)) return;
    votos.set(n, (votos.get(n) ?? 0) + peso);
  };

  for (const { localidad } of filas) {
    const estafeta = localidad.match(/^(.+?)\s+(?:Estafeta|Sucursal|Suc\.?|Agencia)\b/i);
    if (estafeta) { sumar(estafeta[1], 3); continue; }

    const parenCabecera =
      localidad.match(/\(([^,()]+?)\s*,\s*(?:Pdo|Partido|Dpto)/i) ??
      localidad.match(/\(([^()-]+?)\s*-\s*Dpto/i);
    if (parenCabecera) sumar(parenCabecera[1], 2);

    if (!localidad.includes('(')) sumar(localidad, 1);
  }

  let ciudad = CABECERAS[cp] ?? '';
  if (!ciudad && votos.size > 0) {
    ciudad = [...votos.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
    // Un solo voto débil entre muchas filas no alcanza para afirmar cabecera.
    ciudad = ciudad[1] >= 2 || filas.length === 1 ? prolijo(ciudad[0]) : '';
  }
  if (ciudad) conCiudad++;
  salida[cp] = [ciudad, provincia];
}

// CPs de CABA que el listado del Correo no trae pero el cruce de CPAs sí.
for (const [cp, barrio] of Object.entries(BARRIOS_CABA)) {
  if (!salida[cp]) {
    salida[cp] = [barrio, 'CABA'];
    conCiudad++;
  }
}

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cp-localidades.json');
const ordenado = Object.fromEntries(Object.entries(salida).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(destino, JSON.stringify(ordenado));
console.log(`${Object.keys(salida).length} CPs (${conCiudad} con ciudad) → ${destino}`);
