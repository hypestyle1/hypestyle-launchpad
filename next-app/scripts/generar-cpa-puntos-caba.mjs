// Genera data/cpa-puntos-caba.json: puntos georreferenciados de CABA con su
// código postal de 4 dígitos, para resolver dirección → CP por punto más
// cercano en /api/direccion-caba (la API de USIG normaliza la dirección y da
// la coordenada, pero no informa el código postal).
//
// Fuente: cpa_geo_parcial.csv de OpenDataCordoba/codigo-postal-argentino
// (CPAs del Correo georreferenciados; ~41.000 puntos en CABA, uno por cuadra).
// Se redondea a 4 decimales (~10 m) y se deduplican los repetidos.
//
// Uso: node scripts/generar-cpa-puntos-caba.mjs <cpa_geo_parcial.csv>
//
// Nota: el mapa CP → barrio (cp-barrios-caba.json) se genera aparte, cruzando
// estos mismos puntos contra los polígonos de barrios del GCBA, y solo afirma
// un barrio con dominancia >= 80% — una inferencia estadística no es una
// dirección confirmada. Los CPs repartidos (1414, 1425, 1437...) quedan sin
// barrio: en domicilio lo completa exacto la dirección vía USIG, y en retiro
// en sucursal el barrio directamente no se pide.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Uso: node scripts/generar-cpa-puntos-caba.mjs <cpa_geo_parcial.csv>');
  process.exit(1);
}

const vistos = new Set();
const puntos = [];
for (const linea of readFileSync(csvPath, 'utf8').split('\n')) {
  const [, cpa, lng, lat] = linea.split(',');
  if (!cpa || cpa[0] !== 'C' || !lng || !lat) continue;
  const cp = cpa.slice(1, 5);
  if (!/^1[0-4]\d\d$/.test(cp)) continue;
  const x = Math.round(parseFloat(lng) * 1e4) / 1e4;
  const y = Math.round(parseFloat(lat) * 1e4) / 1e4;
  const clave = `${x},${y},${cp}`;
  if (vistos.has(clave)) continue;
  vistos.add(clave);
  puntos.push([x, y, cp]);
}

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cpa-puntos-caba.json');
writeFileSync(destino, JSON.stringify(puntos));
console.log(`${puntos.length} puntos → ${destino}`);
