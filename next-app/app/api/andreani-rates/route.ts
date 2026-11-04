import { NextRequest, NextResponse } from 'next/server';
import { cotizarAndreaniConEstado } from '@/lib/andreani-cotizador';

// Misma función que usa la creación del pedido para recotizar el envío: lo que
// el checkout muestra y lo que se cobra salen del mismo tarifario (y desde el
// 3/11, del mismo caché de 15 min — ver lib/andreani-cotizador.ts).
// El header x-andreani-cache (HIT/MISS/STALE) permite medir la reducción de
// llamadas a admin-ajax en los logs de Vercel sin cambiar el cuerpo.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cp = searchParams.get('cp') || '';
  if (!cp) return NextResponse.json({ error: 'cp requerido' }, { status: 400 });

  try {
    const { data, estado } = await cotizarAndreaniConEstado({
      cp,
      provincia: searchParams.get('provincia') || '',
      valor: searchParams.get('valor') || '10000',
      peso: searchParams.get('peso') || '0.5',
    });
    const headers = { 'x-andreani-cache': estado };
    if (data.error === 'cp requerido') return NextResponse.json(data, { status: 400, headers });
    return NextResponse.json(data, { headers });
  } catch (err) {
    console.error('[andreani-rates]', err);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}
