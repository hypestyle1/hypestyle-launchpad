import { NextRequest, NextResponse } from 'next/server';
import { guardarCreador, avisarPostulacion } from '@/lib/creadores';
import { traducirPostulacion, metaDeTraduccion } from '@/lib/traducir';

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
    // En qué idioma estaba el formulario y qué declara el navegador. Se guardan
    // los dos porque no siempre coinciden con el idioma en que efectivamente
    // escribió: alguien puede tener el formulario en inglés y contestar en
    // portugués.
    idioma: limpio(body.idioma) || 'ES',
    locale: limpio(body.locale),
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

  // Traducción al español de las respuestas abiertas, para que el equipo pueda
  // leerlas sin copiar y pegar en un traductor. Va DESPUÉS de guardar y no
  // puede tirar abajo el envío: si falla, la postulación ya existe y queda
  // marcada como pendiente para reintentar desde el panel.
  try {
    const r = await traducirPostulacion(campos);
    await guardarCreador({ email: campos.email, nombre: campos.nombre, ...metaDeTraduccion(r) });
  } catch (e) {
    console.error('[api/creadores] la traducción falló, la postulación queda pendiente:', e);
    await guardarCreador({ email: campos.email, nombre: campos.nombre, traduccion_estado: 'pendiente' }).catch(() => {});
  }

  // Si el aviso falla, la postulación ya quedó guardada y se ve igual en el
  // panel. Se avisa fuerte en el log y nada más.
  const avisado = await avisarPostulacion(campos, guardado.repetido);
  if (!avisado) console.error('[api/creadores] postulación guardada pero el aviso no salió —', guardado.id);

  return NextResponse.json({ ok: true, actualizada: guardado.repetido });
}
