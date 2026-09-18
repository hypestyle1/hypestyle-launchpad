import { NextRequest, NextResponse } from 'next/server';
import { fetchProductDetail } from '@/lib/product-detail';
import {
  esIdiomaTraducible,
  hayClaveDeTraduccion,
  traducirTextosProductoCacheado,
} from '@/lib/producto-traduccion';

// GET /api/producto/traduccion?slug=<slug>&lang=<EN|PT|DE|FR|IT>
//
// Devuelve la descripción y la ficha del modelo de un producto traducidas. La
// ficha (ProductoClient) la pide desde el browser cuando el idioma elegido no
// es español, porque el idioma vive en localStorage y el servidor no lo
// conoce al renderizar.
//
// Solo traduce productos que existen en Woo: un slug inventado devuelve 404
// sin gastar una llamada a OpenAI. Cualquier fallo responde error y la ficha
// se queda en español.

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,120}$/;

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
  const lang = (req.nextUrl.searchParams.get('lang') || '').trim().toUpperCase();

  if (!SLUG_RE.test(slug) || !esIdiomaTraducible(lang)) {
    return NextResponse.json({ error: 'parametros' }, { status: 400 });
  }
  if (!hayClaveDeTraduccion()) {
    return NextResponse.json({ error: 'sin-clave' }, { status: 503 });
  }

  let product;
  try {
    product = await fetchProductDetail(slug, { server: true });
  } catch (e) {
    console.error('[producto/traduccion] no se pudo leer el producto', slug, e);
    return NextResponse.json({ error: 'catalogo' }, { status: 502 });
  }
  if (!product) return NextResponse.json({ error: 'no-existe' }, { status: 404 });

  const description = product.description || '';
  const modelInfo = product.modelInfo || '';
  const cacheHeaders = {
    // El CDN de Vercel también la guarda: la mayoría de las visitas ni llegan
    // a la función. Una semana de stale mientras se renueva atrás.
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  };

  if (!description && !modelInfo) {
    return NextResponse.json({ description: '', modelInfo: '' }, { headers: cacheHeaders });
  }

  try {
    const textos = await traducirTextosProductoCacheado(lang, description, modelInfo);
    return NextResponse.json(textos, { headers: cacheHeaders });
  } catch (e) {
    console.error('[producto/traduccion] falló la traducción', slug, lang, e);
    return NextResponse.json({ error: 'traduccion' }, { status: 502 });
  }
}
