import { NextRequest, NextResponse } from 'next/server';
import { wcAuth, verifyApprovalToken, sendAprobacionEmail, statusFromMeta } from '@/lib/mayorista-account';
import { parseExclusividad, enZona, zonaDe } from '@/lib/mayorista-exclusividad';

// Aprobación de una solicitud mayorista desde el link del mail.
//
// El GET solo LEE la solicitud — nunca aprueba. Es a propósito: los escáneres
// de Gmail y los antivirus corporativos abren los links de los mails para
// revisarlos, así que un GET que activara la cuenta aprobaría solicitudes sin
// que nadie las mire. Activar exige un POST, o sea el botón de la pantalla.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

function metaVal(meta: { key: string; value: string }[] | undefined, key: string): string {
  return meta?.find((m) => m.key === key)?.value ?? '';
}

async function loadCustomer(id: number) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${id}?_fields=id,email,first_name,last_name,billing,meta_data`, {
    headers: { Authorization: wcAuth() },
    cache: 'no-store',
  });
  return res.ok ? res.json() : null;
}

// ¿Otro local tiene la exclusividad de la zona de esta solicitud? Mismo
// aviso que muestra /admin/mayoristas en la lista de pendientes; quien aprueba
// desde el link del mail no lo veía. Solo avisa: aprobar sigue siendo posible.
async function exclusividadEnZonaDe(ciudad: string, excluirId: number): Promise<{ zona: string; titular: string; desde: string } | null> {
  if (!ciudad) return null;
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers?per_page=100&page=${page}&_fields=id,first_name,last_name,billing,meta_data`, {
      headers: { Authorization: wcAuth() },
      cache: 'no-store',
    }).catch(() => null);
    if (!res?.ok) return null;
    const batch = await res.json() as any[];
    for (const c of batch) {
      if (Number(c.id) === excluirId) continue;
      const e = parseExclusividad(c.meta_data);
      if (e && enZona(e, ciudad)) {
        return { zona: zonaDe(e).nombre, titular: c.billing?.company || `${c.first_name || ''} ${c.last_name || ''}`.trim(), desde: e.desde };
      }
    }
    if (batch.length < 100) break;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const customerId = await verifyApprovalToken(token);
  if (!customerId) return NextResponse.json({ ok: false, message: 'El link no es válido o venció' }, { status: 400 });

  const c = await loadCustomer(customerId);
  if (!c) return NextResponse.json({ ok: false, message: 'No encontramos la solicitud' }, { status: 404 });

  const meta = c.meta_data ?? [];
  const exclusividadVigente = await exclusividadEnZonaDe(c.billing?.city || '', Number(c.id)).catch(() => null);
  return NextResponse.json({
    ok: true,
    exclusividadVigente,
    solicitud: {
      id: c.id,
      email: c.email,
      status: statusFromMeta(metaVal(meta, 'es_mayorista')),
      razonSocial: c.billing?.company || '',
      contacto: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      telefono: c.billing?.phone || '',
      ciudad: c.billing?.city || '',
      provincia: c.billing?.state || '',
      cuit: metaVal(meta, 'mayorista_cuit'),
      instagram: metaVal(meta, 'mayorista_instagram'),
      localFisico: metaVal(meta, 'mayorista_local_fisico') === 'yes',
      modalidad: metaVal(meta, 'mayorista_modalidad'),
      fecha: metaVal(meta, 'mayorista_solicitud_fecha'),
    },
  });
}

export async function POST(req: NextRequest) {
  const { token, decision } = await req.json().catch(() => ({}));
  const customerId = await verifyApprovalToken(typeof token === 'string' ? token : '');
  if (!customerId) return NextResponse.json({ ok: false, message: 'El link no es válido o venció' }, { status: 400 });
  if (decision !== 'aprobar' && decision !== 'rechazar') {
    return NextResponse.json({ ok: false, message: 'Decisión inválida' }, { status: 400 });
  }

  const value = decision === 'aprobar' ? 'yes' : 'no';
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({ meta_data: [{ key: 'es_mayorista', value }] }),
  });
  if (!res.ok) {
    console.error('[admin/aprobar] WC error:', res.status, await res.text().catch(() => ''));
    return NextResponse.json({ ok: false, message: 'No pudimos guardar la decisión' }, { status: 502 });
  }

  let emailSent = false;
  if (decision === 'aprobar') {
    const c = await loadCustomer(customerId);
    if (c) {
      const label = (c.billing?.company || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email).trim();
      emailSent = await sendAprobacionEmail({ id: c.id, email: c.email, label });
      if (!emailSent) console.error('[admin/aprobar] aprobado pero el mail al cliente no salió — customer', customerId);
    }
  }

  return NextResponse.json({ ok: true, decision, emailSent });
}
