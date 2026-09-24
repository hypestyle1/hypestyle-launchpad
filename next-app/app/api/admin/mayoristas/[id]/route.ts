import { NextRequest, NextResponse } from 'next/server';
import { getMayoristaById, sendNewPasswordEmail, sendAprobacionEmail, sendCreditEmail } from '@/lib/mayorista-account';
import { parseCredit, addMovement, creditMetaEntry } from '@/lib/mayorista-credit';
import { adminSecretMatches } from '@/lib/admin-auth';

const WP_URL       = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const WC_KEY       = process.env.WC_CONSUMER_KEY    || '';
const WC_SEC       = process.env.WC_CONSUMER_SECRET || '';

function wcAuth() {
  return 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SEC}`).toString('base64');
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!adminSecretMatches(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { active, minOrder, password, approve, credito } = body as {
    active?: boolean; minOrder?: number | null; password?: string; approve?: boolean;
    credito?: { monto: number; motivo: string; orden?: string };
  };

  // Nota de crédito: suma (o corrige, con monto negativo) el saldo a favor que
  // se descuenta solo del próximo pedido. Va aparte del resto porque tiene que
  // leer el saldo actual antes de escribir.
  if (credito !== undefined) {
    const monto = Number(credito?.monto);
    const motivo = String(credito?.motivo ?? '').trim();
    if (!Number.isFinite(monto) || monto === 0 || !motivo) {
      return NextResponse.json({ message: 'Crédito inválido: hace falta monto y motivo' }, { status: 400 });
    }
    const cur = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${params.id}?_fields=id,meta_data`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    });
    if (!cur.ok) return NextResponse.json({ message: `Error de WooCommerce (${cur.status})` }, { status: 502 });
    const next = addMovement(parseCredit((await cur.json()).meta_data), {
      fecha: new Date().toISOString(),
      monto,
      motivo,
      ...(credito.orden ? { orden: String(credito.orden) } : {}),
    });
    const put = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify({ meta_data: [creditMetaEntry(next)] }),
    });
    if (!put.ok) return NextResponse.json({ message: `Error de WooCommerce (${put.status})` }, { status: 502 });

    // Solo las cargas avisan al cliente; una corrección para abajo no.
    let emailSent = false;
    if (monto > 0) {
      const account = await getMayoristaById(Number(params.id));
      if (account) emailSent = await sendCreditEmail(account, monto, next.saldo, motivo);
    }
    return NextResponse.json({ ok: true, credit: next.saldo, emailSent });
  }

  if (active === undefined && minOrder === undefined && password === undefined) {
    return NextResponse.json({ message: 'Nada para actualizar' }, { status: 400 });
  }
  if (minOrder !== undefined && minOrder !== null && (typeof minOrder !== 'number' || !Number.isFinite(minOrder) || minOrder < 0)) {
    return NextResponse.json({ message: 'minOrder inválido' }, { status: 400 });
  }
  // La contraseña vieja no se puede leer: WordPress la guarda hasheada y no hay
  // forma de recuperarla, ni por REST ni por base. Por eso acá solo se pisa por
  // una nueva, que el panel muestra una única vez y después se pierde — igual
  // que en el alta.
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
  }

  // Sin guión bajo: WC descarta en silencio los meta "protegidos" al
  // actualizar un customer por REST (mismo motivo que en la creación).
  const metaData: { key: string; value: string }[] = [];
  if (active !== undefined) metaData.push({ key: 'es_mayorista', value: active ? 'yes' : 'no' });
  // Fecha de aprobación: cierra el tramo solicitud → aprobado del funnel
  // mayorista. Solo al aprobar (no al revocar ni al reactivar).
  if (active === true && approve === true) metaData.push({ key: 'mayorista_aprobado_fecha', value: new Date().toISOString() });
  if (minOrder !== undefined) metaData.push({ key: 'mayorista_min_order', value: minOrder === null ? '' : String(minOrder) });

  const payload: Record<string, unknown> = {};
  if (metaData.length) payload.meta_data = metaData;
  if (password !== undefined) payload.password = password;

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${params.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[admin/mayoristas/id] WC error:', res.status, txt);
    return NextResponse.json({ message: `Error de WooCommerce (${res.status})` }, { status: 502 });
  }

  // Con la clave nueva ya guardada, se la mandamos al cliente por mail. Copiarla
  // a mano por WhatsApp es justo donde estas claves se perdían.
  // Aprobar una solicitud avisa al comercio; activar a alguien que ya entraba
  // (por ejemplo tras revocarlo) no, para no mandarle una bienvenida repetida.
  if (approve === true) {
    const account = await getMayoristaById(Number(params.id));
    if (account) await sendAprobacionEmail(account);
  }

  let emailSent = false;
  if (password !== undefined) {
    const account = await getMayoristaById(Number(params.id));
    if (account) {
      emailSent = await sendNewPasswordEmail(account, password);
    }
    // Si el mail falla no se revierte nada: la contraseña nueva ya es la válida
    // y el panel la muestra en pantalla, así que siempre queda la salida manual.
    if (!emailSent) {
      console.error('[admin/mayoristas/id] contraseña cambiada pero el mail no salió — pasarla a mano');
    }
  }

  // La contraseña no vuelve en la respuesta: el panel ya la tiene porque fue él
  // quien la generó y la mandó.
  return NextResponse.json({ ok: true, active, minOrder, passwordChanged: password !== undefined, emailSent });
}
