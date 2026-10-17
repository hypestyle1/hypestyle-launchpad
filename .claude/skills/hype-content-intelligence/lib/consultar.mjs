#!/usr/bin/env node
/**
 * CLI de consulta de Hype Content Intelligence.
 *
 * Trae las publicaciones de UNA de estas dos fuentes y lo dice siempre:
 *   - REAL  → GET /api/admin/ig-posts del panel (el mismo endpoint que usa la
 *             Biblioteca; no se crea ninguna ruta nueva). Requiere la clave de
 *             admin en HYPE_ADMIN_KEY o --key.
 *   - DEMO  → fixtures/demo.json, dataset SINTÉTICO (ids 999…, permalinks
 *             /p/DEMO…). Sirve para probar el skill, nunca para decidir.
 *
 * Nunca escribe en producción, nunca toca Instagram ni Meta, nunca modifica
 * credenciales. Es solo lectura.
 *
 * Uso:
 *   node lib/consultar.mjs <comando> [opciones]
 *
 * Comandos:
 *   top           ranking por una métrica
 *   segmentos     medianas por dimensión (categoria|portada|estilo|formato|escenario|campania)
 *   contrastar    dos segmentos enfrentados (--a X --b Y)
 *   producto      qué funcionó para un producto (--producto "camo cap" | --producto 881)
 *   mezcla        repetición de formatos contra la mezcla objetivo
 *   resumen       panorama general del período
 *
 * Opciones comunes:
 *   --dias 90            ventana temporal (default 90)
 *   --metrica likesReach likesReach|erReach|savedReach|sharesReach|commentsReach|followsReach|likesViews
 *   --distribucion organico|pago|todo   (default organico)
 *   --dimension categoria
 *   --formato REELS|FEED|CARRUSEL
 *   --categoria flatlay   --portada producto-piso   --estilo luz-natural
 *   --limite 10          --json
 *   --demo               fuerza el dataset sintético
 *   --base http://localhost:3000   --key <clave admin>
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  compararSegmentos,
  contrastar,
  detectarRepeticion,
  filtrar,
  huecos,
  MIN_SAMPLE,
  nivelDeConfianza,
  porProducto,
  rankear,
} from './analisis.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

/* ─── Argumentos ────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) out[k] = true;
      else {
        out[k] = v;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

/* ─── Fuente de datos ───────────────────────────────────────────────────── */

function cargarDemo() {
  const ruta = resolve(AQUI, '../fixtures/demo.json');
  const data = JSON.parse(readFileSync(ruta, 'utf8'));
  return {
    fuente: 'DEMO',
    sintetico: true,
    rows: data.rows,
    aviso: data._aviso,
  };
}

async function cargarReal({ base, key }) {
  const url = new URL('/api/admin/ig-posts', base);
  url.searchParams.set('limit', '200');
  const res = await fetch(url, { headers: key ? { 'x-admin-key': key } : {} });
  if (!res.ok) {
    throw new Error(
      `El panel respondió ${res.status} en ${url.pathname}. ` +
        (res.status === 403
          ? 'Falta la clave: exportá HYPE_ADMIN_KEY o pasá --key.'
          : 'Verificá que el panel esté levantado y accesible.'),
    );
  }
  const data = await res.json();
  // El endpoint marca fixture:true cuando el backend de ingesta no está
  // desplegado todavía (gate B1): en ese caso los datos NO son reales.
  return {
    fuente: data.fixture ? 'DEMO (el panel todavía no tiene backend de ingesta)' : 'REAL',
    sintetico: Boolean(data.fixture),
    rows: Array.isArray(data.rows) ? data.rows : [],
    aviso: data.fixture
      ? 'El panel devolvió datos sintéticos porque el mu-plugin de ingesta no está desplegado (gate B1).'
      : null,
  };
}

async function obtenerDatos(args) {
  if (args.demo) return cargarDemo();
  const base = args.base || process.env.HYPE_PANEL_URL || 'http://localhost:3000';
  const key = args.key || process.env.HYPE_ADMIN_KEY || '';
  try {
    return await cargarReal({ base, key });
  } catch (err) {
    // Nunca se cae a datos sintéticos en silencio: o se pide --demo, o falla.
    throw new Error(
      `${err.message}\n\nSi querés probar el skill sin datos reales, agregá --demo ` +
        '(el resultado quedará marcado como SINTÉTICO y no sirve para decidir).',
    );
  }
}

/* ─── Formateo ──────────────────────────────────────────────────────────── */

const pct = (v, d = 2) => (v == null ? '—' : (v * 100).toFixed(d).replace('.', ',') + '%');
const fac = (v) => (v == null ? '—' : v.toFixed(2).replace('.', ',') + '×');
const int = (v) => (v == null ? '—' : new Intl.NumberFormat('es-AR').format(v));

function cabecera(datos, universo, opciones) {
  const h = huecos(universo.todas);
  const lineas = [
    `Fuente: ${datos.fuente}${datos.sintetico ? '  ⚠ DATOS SINTÉTICOS — no sirven para decidir' : ''}`,
    `Universo: ${universo.filtradas.length} publicaciones ${opciones.distribucion === 'pago' ? 'CON PAUTA' : opciones.distribucion === 'todo' ? '(orgánicas + pauteadas, sin segmentar)' : 'orgánicas'}` +
      (opciones.dias ? ` · últimos ${opciones.dias} días` : ' · todo el histórico'),
  ];
  if (h.sinMetricas) lineas.push(`Sin insights (excluidas): ${h.sinMetricas}`);
  if (h.sinClasificar) lineas.push(`Sin clasificar: ${h.sinClasificar} — no entran en cortes por categoría/portada/estilo`);
  if (datos.aviso) lineas.push(`Aviso: ${datos.aviso}`);
  return lineas.join('\n');
}

function imprimirRanking(r) {
  const out = [
    `\nRanking por ${r.metrica}${r.secundaria ? ' (métrica SECUNDARIA)' : ''} — n=${r.n}, mediana ${pct(r.mediana)}`,
  ];
  if (r.aviso) out.push(`  ⚠ ${r.aviso}`);
  if (r.muestraChica) out.push(`  ⚠ n<${MIN_SAMPLE}: alcanza para mirar, no para concluir.`);
  for (const [i, it] of r.items.entries()) {
    out.push(
      `  ${String(i + 1).padStart(2)}. ${pct(it.valor).padStart(7)}  ${fac(it.vsMediana).padStart(6)} mediana  ` +
        `${it.fecha}  ${it.formato}/${it.categoria ?? 'sin clasificar'}  alcance ${int(it.alcance)}` +
        (it.atipico ? '  [ATÍPICO]' : '') +
        (it.pauteada ? '  [PAUTEADA]' : ''),
    );
    out.push(`      ${it.permalink}`);
  }
  return out.join('\n');
}

function imprimirSegmentos(c) {
  const out = [`\nPor ${c.dimension}, métrica ${c.metrica}${c.secundaria ? ' (SECUNDARIA)' : ''}:`];
  for (const s of c.segmentos) {
    out.push(
      `  ${s.key.padEnd(16)} n=${String(s.n).padStart(3)}  mediana ${pct(s.median).padStart(7)}  ` +
        `p25–p75 ${pct(s.p25)}–${pct(s.p75)}` +
        (s.smallSample ? `  ⚠ muestra chica` : ''),
    );
  }
  out.push(
    c.evidenciaSuficiente
      ? `  → ${c.comparables} segmentos con n≥${MIN_SAMPLE}: se pueden comparar entre sí (ojo con los confusores).`
      : `  → Menos de 2 segmentos con n≥${MIN_SAMPLE}: NO alcanza para comparar. Cualquier diferencia es anecdótica.`,
  );
  return out.join('\n');
}

/* ─── Comandos ──────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const comando = args._[0];

  if (!comando || args.help || args.h) {
    console.log(readFileSync(resolve(AQUI, 'consultar.mjs'), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
    process.exit(0);
  }

  const datos = await obtenerDatos(args);
  const opciones = {
    dias: args.dias === undefined ? 90 : args.dias === true || args.dias === 'todo' ? null : Number(args.dias),
    distribucion: args.distribucion || 'organico',
    formato: args.formato || null,
    categoria: args.categoria || null,
    portada: args.portada || null,
    estilo: args.estilo || null,
    campania: args.campania ?? null,
    texto: args.texto || null,
    ahora: datos.sintetico ? '2026-10-17T18:00:00Z' : undefined,
  };
  const metrica = args.metrica || 'likesReach';
  const limite = Number(args.limite) || 10;

  const filtradas = filtrar(datos.rows, opciones);
  const universo = { todas: datos.rows, filtradas };

  let resultado;
  let texto;

  switch (comando) {
    case 'top': {
      resultado = rankear(filtradas, { metrica, limite });
      texto = imprimirRanking(resultado);
      break;
    }
    case 'segmentos': {
      resultado = compararSegmentos(filtradas, { dimension: args.dimension || 'categoria', metrica });
      texto = imprimirSegmentos(resultado);
      break;
    }
    case 'contrastar': {
      if (!args.a || !args.b) throw new Error('contrastar necesita --a <segmento> --b <segmento>');
      resultado = contrastar(filtradas, {
        dimension: args.dimension || 'categoria',
        a: args.a,
        b: args.b,
        metrica,
      });
      const conf = nivelDeConfianza({
        n: Math.min(resultado.a.n, resultado.b.n),
        comparables: 2,
        solapan: resultado.solapan,
      });
      texto =
        `\n${args.a} vs ${args.b} — ${resultado.metrica}\n` +
        `  ${args.a}: n=${resultado.a.n}, mediana ${pct(resultado.a.median)} (p25–p75 ${pct(resultado.a.p25)}–${pct(resultado.a.p75)})\n` +
        `  ${args.b}: n=${resultado.b.n}, mediana ${pct(resultado.b.median)} (p25–p75 ${pct(resultado.b.p25)}–${pct(resultado.b.p75)})\n` +
        `  Diferencia observada: ${fac(resultado.factor)}\n` +
        `  Veredicto: ${resultado.veredicto.toUpperCase()} · confianza ${conf.nivel}\n` +
        resultado.limitaciones.map((l) => `   - ${l}`).join('\n');
      break;
    }
    case 'producto': {
      if (!args.producto) throw new Error('producto necesita --producto <id de Woo o texto del copy>');
      resultado = porProducto(datos.rows, { producto: args.producto, metrica });
      texto =
        `\nProducto "${resultado.producto}" — ${resultado.n} publicaciones con métricas` +
        (resultado.muestraChica ? `  ⚠ menos de ${MIN_SAMPLE}: son referencias, no un patrón` : '') +
        '\n' +
        imprimirRanking(resultado.ranking) +
        '\n' +
        imprimirSegmentos(resultado.porFormato) +
        '\n' +
        imprimirSegmentos(resultado.porPortada);
      break;
    }
    case 'mezcla': {
      resultado = detectarRepeticion(filtradas, { ahora: opciones.ahora ?? Date.now() });
      const filas = resultado.filas.map(
        (f) =>
          `  ${f.categoria.padEnd(16)} ${String(f.n).padStart(3)} pub  ${pct(f.real, 0).padStart(5)} real  ` +
          `vs ${pct(f.objetivo, 0)} objetivo  ${f.desvio > 0 ? '+' : ''}${pct(f.desvio, 0)}` +
          (f.diasDesdeLaUltima == null ? '  · nunca' : `  · última hace ${f.diasDesdeLaUltima} d`),
      );
      texto =
        `\nMezcla editorial (${resultado.total} clasificadas, ${resultado.sinClasificar} sin clasificar):\n` +
        filas.join('\n') +
        `\n  Racha más larga: ${resultado.rachaMaxima.largo} seguidas de "${resultado.rachaMaxima.categoria ?? '—'}"` +
        (resultado.sobrerrepresentadas.length
          ? `\n  Sobre el objetivo: ${resultado.sobrerrepresentadas.map((f) => f.categoria).join(', ')}`
          : '') +
        (resultado.subrepresentadas.length
          ? `\n  Por debajo: ${resultado.subrepresentadas.map((f) => f.categoria).join(', ')}`
          : '') +
        (resultado.nota ? `\n  ⚠ ${resultado.nota}` : '') +
        '\n  La mezcla objetivo es una HIPÓTESIS de trabajo de la Fase 0, no una regla.';
      break;
    }
    case 'resumen': {
      const porCategoria = compararSegmentos(filtradas, { dimension: 'categoria', metrica });
      const porFormato = compararSegmentos(filtradas, { dimension: 'formato', metrica });
      resultado = {
        huecos: huecos(datos.rows),
        top: rankear(filtradas, { metrica, limite: 3 }),
        porCategoria,
        porFormato,
        mezcla: detectarRepeticion(filtradas, { ahora: opciones.ahora ?? Date.now() }),
      };
      texto =
        imprimirRanking(resultado.top) + '\n' + imprimirSegmentos(porFormato) + '\n' + imprimirSegmentos(porCategoria);
      break;
    }
    default:
      throw new Error(`Comando desconocido: ${comando}. Probá: top, segmentos, contrastar, producto, mezcla, resumen.`);
  }

  if (args.json) {
    console.log(
      JSON.stringify({ fuente: datos.fuente, sintetico: datos.sintetico, comando, opciones, resultado }, null, 2),
    );
  } else {
    console.log(cabecera(datos, universo, opciones));
    console.log(texto);
    if (datos.sintetico) {
      console.log('\n⚠ RECORDATORIO: los números de arriba son sintéticos. No los cites como resultados de Hype.');
    }
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
