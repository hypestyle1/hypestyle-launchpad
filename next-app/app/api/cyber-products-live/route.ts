import { NextResponse } from 'next/server';
import { CYBER_START } from '@/lib/cyber-hype';
import { fetchAllProductsStrict } from '@/lib/products-server';
import { SLUGS_INTERNOS, fetchCatalogForSsr } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/**
 * Precios efectivos del catálogo Cyber para la home/landing.
 *
 * Incidente MariaDB/Hostinger 2–4/11/2026: este endpoint bajaba el catálogo
 * ENTERO fresco de WPGraphQL (2 páginas de 100, ~11 s) por cada visitante y
 * cada minuto (useCyberCatalogTransition sondea cada 60 s, al montar y en cada
 * foco). Con N visitantes en la home eran N lecturas pesadas por minuto
 * ocupando procesos PHP y conexiones MySQL — justo lo que dispara la
 * revocación automática de permisos de Hostinger.
 *
 * Ahora:
 * - Ventana de apertura (primeros 2 min desde CYBER_START): igual que antes,
 *   lectura fresca sin caché, para que el cambio de precio a las 19:00 sea exacto.
 * - Después: una sola lectura fresca de Woo por minuto COMPARTIDA entre todos
 *   los visitantes (caché de datos de Next, 60 s) + CDN 30 s. Lo que ve el
 *   cliente tiene como máximo ~2 min; el precio que se cobra lo recalcula el
 *   servidor al crear el pedido (pedido-servidor).
 * - Si Woo falla no se cachea nada: 503 sin caché y el próximo request reintenta.
 *
 * Sigue aislado de la caché compartida del carrito (clave propia).
 */
const VENTANA_APERTURA_MS = 2 * 60_000;

async function leerCatalogo() {
  return (await fetchAllProductsStrict(true)).filter(p => !SLUGS_INTERNOS.has(p.slug));
}

// Integración 4/11: en vez de una caché propia, usa el MISMO catálogo
// compartido que los listados (lib/catalog.ts: unstable_cache 60 s +
// cortacircuitos + 1 intento). Una sola lectura del catálogo por minuto para
// toda la tienda, y si WordPress falla se sirve la última versión buena.
const leerCatalogoCompartido = fetchCatalogForSsr;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const serverTime = Date.now();
  const inicio = Date.parse(CYBER_START);
  const active = serverTime >= inicio;
  if (!active) return NextResponse.json({ active, serverTime, products: [] }, { headers: NO_STORE });
  const apertura = serverTime - inicio < VENTANA_APERTURA_MS;
  try {
    const products = apertura ? await leerCatalogo() : await leerCatalogoCompartido();
    return NextResponse.json({ active, serverTime, products }, {
      headers: apertura ? NO_STORE : { 'Cache-Control': `public, s-maxage=30, stale-while-revalidate=600` },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudieron actualizar los precios' }, { status: 503, headers: NO_STORE });
  }
}
