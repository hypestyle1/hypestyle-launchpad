import { NextRequest, NextResponse } from 'next/server';
import puntos from '@/data/cpa-puntos-caba.json';

/**
 * Dirección escrita → código postal y barrio, solo CABA.
 *
 * El normalizador de USIG (API pública del GCBA) valida la calle y la altura
 * y devuelve la coordenada; datos_utiles da el barrio de ese punto. El CP no
 * lo informa ninguna API oficial: sale del punto CPA más cercano en
 * data/cpa-puntos-caba.json (~40.000 puntos del Correo georreferenciados, uno
 * por cuadra — ver scripts/generar-cpa-puntos-caba.mjs).
 *
 * Es un prellenado del checkout: ante cualquier duda responde vacío y el
 * cliente escribe el dato a mano, igual que siempre.
 */

// Las APIs del GCBA devuelven los barrios sin tilde.
const TILDES: Record<string, string> = {
  'Nuñez': 'Núñez', 'Agronomia': 'Agronomía', 'San Nicolas': 'San Nicolás',
  'Constitucion': 'Constitución', 'Villa Pueyrredon': 'Villa Pueyrredón',
};

interface DireccionUsig {
  tipo: string;
  cod_partido: string;
  direccion: string;
  coordenadas?: { x: string | number; y: string | number };
}

// A la latitud de CABA un grado de longitud mide ~82% de uno de latitud.
const ESCALA_X = 0.823;
// Más lejos que ~300 m del punto CPA más cercano ya no es confiable.
const MAX_DIST = 0.003;

function cpMasCercano(x: number, y: number): string | null {
  let mejor = Infinity;
  let cp: string | null = null;
  for (const [px, py, pcp] of puntos as unknown as [number, number, string][]) {
    const dx = (px - x) * ESCALA_X;
    const dy = py - y;
    const d = dx * dx + dy * dy;
    if (d < mejor) { mejor = d; cp = pcp; }
  }
  return mejor <= MAX_DIST * MAX_DIST ? cp : null;
}

export async function GET(req: NextRequest) {
  const direccion = (req.nextUrl.searchParams.get('direccion') ?? '').trim();
  if (direccion.length < 5) return NextResponse.json({ error: 'direccion requerida' }, { status: 400 });

  try {
    const res = await fetch(
      `https://servicios.usig.buenosaires.gob.ar/normalizar/?direccion=${encodeURIComponent(direccion)}&geocodificar=true&maxOptions=3`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return NextResponse.json({});
    const data = (await res.json()) as { direccionesNormalizadas?: DireccionUsig[] };
    const match = data.direccionesNormalizadas?.find(
      d => d.cod_partido === 'caba' && d.tipo === 'calle_altura' && d.coordenadas,
    );
    if (!match?.coordenadas) return NextResponse.json({});
    const x = parseFloat(String(match.coordenadas.x));
    const y = parseFloat(String(match.coordenadas.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return NextResponse.json({});

    // El barrio es un extra: si datos_utiles no contesta, el CP igual sirve.
    let barrio = '';
    try {
      const du = await fetch(`https://ws.usig.buenosaires.gob.ar/datos_utiles/?x=${x}&y=${y}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (du.ok) {
        const info = (await du.json()) as { barrio?: string };
        barrio = info.barrio ? (TILDES[info.barrio] ?? info.barrio) : '';
      }
    } catch { /* sin barrio */ }

    const cp = cpMasCercano(x, y);
    if (!cp) return NextResponse.json({});
    return NextResponse.json({ cp, barrio, direccion: match.direccion });
  } catch (err) {
    console.error('[direccion-caba]', err);
    return NextResponse.json({});
  }
}
