import { NextRequest, NextResponse } from 'next/server';
import { cotizarAndreani } from '@/lib/andreani-cotizador';

// Misma función que usa la creación del pedido para recotizar el envío: lo que
// el checkout muestra y lo que se cobra salen del mismo tarifario.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cp = searchParams.get('cp') || '';
  if (!cp) return NextResponse.json({ error: 'cp requerido' }, { status: 400 });

  try {
    const data = await cotizarAndreani({
      cp,
      provincia: searchParams.get('provincia') || '',
      valor: searchParams.get('valor') || '10000',
      peso: searchParams.get('peso') || '0.5',
    });
    if (data.error === 'cp requerido') return NextResponse.json(data, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[andreani-rates]', err);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}
