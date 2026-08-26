import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-auth';
import { listarCreadores, guardarCreador } from '@/lib/creadores';
import { traducirPostulacion, metaDeTraduccion, CAMPOS_ABIERTOS } from '@/lib/traducir';

// Reintento de traducción desde el panel. Existe porque la traducción nunca
// bloquea el envío de una postulación: si el servicio estaba caído, la
// postulación se guardó igual y quedó marcada como pendiente.

export async function POST(req: NextRequest) {
  if (!(await authorizeAdmin(req, 'creadores'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await req.json().catch(() => ({}));
  if (!Number.isFinite(Number(id))) {
    return NextResponse.json({ message: 'Falta el id' }, { status: 400 });
  }

  const todos = await listarCreadores();
  const c = todos?.find(x => x.id === Number(id));
  if (!c) return NextResponse.json({ message: 'No encontramos esa postulación' }, { status: 404 });

  const abiertos = Object.fromEntries(CAMPOS_ABIERTOS.map(k => [k, (c as any)[k] || '']));
  const r = await traducirPostulacion(abiertos);

  if (r.estado === 'pendiente') {
    return NextResponse.json({ ok: false, message: 'El traductor sigue sin responder. Probá más tarde.' }, { status: 502 });
  }

  const guardado = await guardarCreador({ email: c.email, nombre: c.nombre, ...metaDeTraduccion(r) });
  if (!guardado) return NextResponse.json({ message: 'No se pudo guardar la traducción' }, { status: 502 });

  return NextResponse.json({ ok: true, estado: r.estado, idiomaDetectado: r.idiomaDetectado, traducciones: r.traducciones });
}
