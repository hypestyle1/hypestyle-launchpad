import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { listarCreadores, actualizarCreador, ESTADOS } from '@/lib/creadores';

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

  const { id, estado, nota, revisadoPor } = await req.json().catch(() => ({}));
  if (!Number.isFinite(Number(id))) {
    return NextResponse.json({ message: 'Falta el id' }, { status: 400 });
  }
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
  }

  const res = await actualizarCreador(Number(id), { estado, nota, revisadoPor: revisadoPor || '' });
  if (!res) return NextResponse.json({ message: 'No se pudo guardar' }, { status: 502 });
  return NextResponse.json(res);
}
