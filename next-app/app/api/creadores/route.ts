import { NextRequest, NextResponse } from 'next/server';
import { guardarCreador, avisarPostulacion } from '@/lib/creadores';

// Postulación pública para crear contenido con Hype.

const limpio = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const MENOR_DE = 18;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const campos: Record<string, string> = {
    nombre: limpio(body.nombre),
    email: limpio(body.email).toLowerCase(),
    telefono: limpio(body.telefono),
    ciudad: limpio(body.ciudad),
    edad: limpio(body.edad),
    instagram: limpio(body.instagram).replace(/^@/, ''),
    tiktok: limpio(body.tiktok).replace(/^@/, ''),
    links: limpio(body.links),
    porque: limpio(body.porque),
    prenda: limpio(body.prenda),
    frecuencia: limpio(body.frecuencia),
    equipo: limpio(body.equipo),
    talle: limpio(body.talle),
    marcas: limpio(body.marcas),
    tutor_nombre: limpio(body.tutor_nombre),
    tutor_contacto: limpio(body.tutor_contacto),
  };

  if (!campos.nombre || !campos.email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'Faltan tu nombre y un mail válido' }, { status: 400 });
  }
  if (!campos.instagram && !campos.tiktok) {
    return NextResponse.json({ ok: false, message: 'Dejanos al menos una cuenta, de Instagram o de TikTok' }, { status: 400 });
  }
  if (!campos.porque) {
    return NextResponse.json({ ok: false, message: 'Contanos por qué querés crear con nosotros' }, { status: 400 });
  }

  // Trabajar con menores necesita un adulto responsable. En el formulario que
  // veníamos usando entraron postulantes de 15 años sin ningún dato de tutor.
  const edad = parseInt(campos.edad, 10);
  if (Number.isFinite(edad) && edad < MENOR_DE && !campos.tutor_nombre) {
    return NextResponse.json({ ok: false, message: 'Como sos menor de 18, necesitamos los datos de un adulto responsable' }, { status: 400 });
  }

  const guardado = await guardarCreador(campos);
  if (!guardado) {
    return NextResponse.json({ ok: false, message: 'No pudimos guardar tu postulación. Probá de nuevo.' }, { status: 502 });
  }

  // Si el aviso falla, la postulación ya quedó guardada y se ve igual en el
  // panel. Se avisa fuerte en el log y nada más.
  const avisado = await avisarPostulacion(campos, guardado.repetido);
  if (!avisado) console.error('[api/creadores] postulación guardada pero el aviso no salió —', guardado.id);

  return NextResponse.json({ ok: true, actualizada: guardado.repetido });
}
