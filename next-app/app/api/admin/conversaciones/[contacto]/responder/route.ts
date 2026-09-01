import { NextRequest, NextResponse } from 'next/server';
import { adminSecretMatches } from '@/lib/admin-auth';

const N8N_URL       = process.env.N8N_ADMIN_REPLY_URL    || 'https://n8n.hypestyle.com.ar/webhook/hypestyle-admin-responder';
const N8N_SECRET    = process.env.N8N_ADMIN_REPLY_SECRET || '';

export async function POST(req: NextRequest, { params }: { params: { contacto: string } }) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { contacto } = params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const canal   = String(body.canal || '');
  const nombre  = String(body.nombre || '');
  const mensaje = String(body.mensaje || '').trim();

  if (!canal || !mensaje) {
    return NextResponse.json({ error: 'Faltan canal o mensaje' }, { status: 400 });
  }
  if (!N8N_SECRET) {
    return NextResponse.json({ error: 'N8N_ADMIN_REPLY_SECRET no configurado' }, { status: 500 });
  }

  const res = await fetch(N8N_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': N8N_SECRET },
    body: JSON.stringify({ canal, contacto, nombre, mensaje }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return NextResponse.json({ error: err || 'Error al enviar el mensaje' }, { status: 502 });
  }

  return NextResponse.json(await res.json());
}
