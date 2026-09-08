import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { listarCreadores, actualizarCreador, ESTADOS, CLAVES_ETIQUETA, valorEtiquetaValido } from '@/lib/creadores';

export async function GET(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const creadores = await listarCreadores();
  if (!creadores) return NextResponse.json({ message: 'No se pudieron leer las postulaciones' }, { status: 502 });
  return NextResponse.json({ creadores });
}

export async function POST(req: NextRequest) {
  const actor = await authorizeAdmin(req, 'creadores');
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { id, estado, nota, revisadoPor } = body;
  if (!Number.isFinite(Number(id))) {
    return NextResponse.json({ message: 'Falta el id' }, { status: 400 });
  }
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
  }
  // Etiquetas (género, relación, cobro): '' vuelve a "sin asignar";
  // undefined no lo toca.
  const etiquetas: Partial<Record<(typeof CLAVES_ETIQUETA)[number], string>> = {};
  for (const clave of CLAVES_ETIQUETA) {
    if (body[clave] === undefined) continue;
    if (!valorEtiquetaValido(clave, body[clave])) {
      return NextResponse.json({ message: `Valor inválido para ${clave}` }, { status: 400 });
    }
    etiquetas[clave] = body[clave];
  }

  const res = await actualizarCreador(Number(id), { estado, nota, revisadoPor: revisadoPor || '', ...etiquetas });
  if (!res) return NextResponse.json({ message: 'No se pudo guardar' }, { status: 502 });
  return NextResponse.json(res);
}
