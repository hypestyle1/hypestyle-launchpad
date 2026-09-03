import { NextRequest, NextResponse } from 'next/server';
import {
  wcAuth,
  findActiveMayoristaByEmail,
  createApprovalToken,
  sendSolicitudAdminEmail,
  type SolicitudData,
} from '@/lib/mayorista-account';

// Alta de mayoristas hecha por el propio comercio.
//
// La cuenta se crea en 'pending', que el login rechaza (exige 'yes'), así que
// existe pero no entra hasta que alguien la aprueba desde el mail o el panel.
// Antes esto se cargaba a mano en /admin/mayoristas, con una contraseña que
// generábamos nosotros y que había que pasarle al cliente por WhatsApp — que
// es justo donde esas claves se perdían.

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const MIN_PASSWORD = 8;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// El CUIT se guarda solo con dígitos: los clientes lo escriben con guiones,
// puntos o espacios y después no hay forma de cruzarlo con la facturación.
function normalizeCuit(v: string): string {
  return v.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const email = clean(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const razonSocial = clean(body.razonSocial);
  const cuit = normalizeCuit(clean(body.cuit));
  const contacto = clean(body.contacto);
  const telefono = clean(body.telefono);
  const instagram = clean(body.instagram).replace(/^@/, '');
  const ciudad = clean(body.ciudad);
  const provincia = clean(body.provincia);
  const modalidad = clean(body.modalidad);
  const localFisico = body.localFisico === true || body.localFisico === 'true';

  // Origen de la solicitud (utm/fbclid/referrer que capturó el formulario).
  // Sin esto no hay forma de saber qué solicitudes vinieron de la campaña de
  // Meta y cuáles entraron solas. Se guarda tal cual, acotado, como meta del
  // customer para que /admin/mayoristas y los reportes lo puedan leer.
  const attr = (body.attribution && typeof body.attribution === 'object') ? body.attribution : {};
  const attrVal = (k: string) => clean(attr[k]).slice(0, 200);
  const attribution = {
    utm_source: attrVal('utm_source'),
    utm_medium: attrVal('utm_medium'),
    utm_campaign: attrVal('utm_campaign'),
    utm_content: attrVal('utm_content'),
    utm_term: attrVal('utm_term'),
    fbclid: attrVal('fbclid'),
    referrer: attrVal('referrer'),
    landing: attrVal('landing'),
  };

  if (!email.includes('@')) return NextResponse.json({ ok: false, message: 'Escribí un mail válido' }, { status: 400 });
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ ok: false, message: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres` }, { status: 400 });
  }
  if (!razonSocial || !contacto || !telefono) {
    return NextResponse.json({ ok: false, message: 'Faltan datos obligatorios' }, { status: 400 });
  }
  // 11 dígitos: 2 de tipo, 8 de documento y 1 verificador.
  if (cuit.length !== 11) {
    return NextResponse.json({ ok: false, message: 'El CUIT tiene que tener 11 números' }, { status: 400 });
  }

  // Si ya es mayorista activo, no tiene sentido una solicitud nueva — se lo
  // manda al login en vez de crearle una cuenta duplicada.
  const yaEs = await findActiveMayoristaByEmail(email);
  if (yaEs) {
    return NextResponse.json(
      { ok: false, alreadyActive: true, message: 'Ese mail ya tiene acceso. Entrá desde el ingreso, y si no recordás la contraseña usá "Olvidé mi contraseña".' },
      { status: 409 },
    );
  }

  const [firstName, ...restName] = contacto.split(' ');
  const billing = {
    first_name: firstName || contacto,
    last_name: restName.join(' '),
    company: razonSocial,
    address_1: '',
    city: ciudad,
    state: provincia,
    postcode: '',
    country: 'AR',
    phone: telefono,
    email,
  };

  // Sin guión bajo, como el resto: WC descarta en silencio los meta
  // "protegidos" al crear un customer por REST.
  const metaData = [
    { key: 'es_mayorista', value: 'pending' },
    { key: 'mayorista_cuit', value: cuit },
    { key: 'mayorista_instagram', value: instagram },
    { key: 'mayorista_local_fisico', value: localFisico ? 'yes' : 'no' },
    { key: 'mayorista_modalidad', value: modalidad },
    { key: 'mayorista_solicitud_fecha', value: new Date().toISOString() },
    // Origen. Vacío cuando la solicitud entró sin parámetros (orgánico/directo).
    { key: 'mayorista_utm_source', value: attribution.utm_source },
    { key: 'mayorista_utm_medium', value: attribution.utm_medium },
    { key: 'mayorista_utm_campaign', value: attribution.utm_campaign },
    { key: 'mayorista_utm_content', value: attribution.utm_content },
    { key: 'mayorista_utm_term', value: attribution.utm_term },
    { key: 'mayorista_fbclid', value: attribution.fbclid },
    { key: 'mayorista_referrer', value: attribution.referrer },
    { key: 'mayorista_landing', value: attribution.landing },
  ];

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      email,
      password,
      first_name: billing.first_name,
      last_name: billing.last_name,
      billing,
      shipping: { ...billing, phone: undefined },
      meta_data: metaData,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[mayorista/solicitud] WC error:', res.status, txt);
    let message = 'No pudimos registrar la solicitud. Probá de nuevo.';
    try {
      const parsed = JSON.parse(txt);
      // Mail ya registrado como cliente minorista: no es un error del sistema,
      // es algo que el comercio tiene que resolver escribiéndonos.
      if (parsed.code === 'registration-error-email-exists') {
        message = 'Ese mail ya está registrado en la tienda. Escribinos y te damos acceso con esa misma cuenta.';
      } else if (parsed.message) {
        message = parsed.message;
      }
    } catch {}
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }

  const created = await res.json();
  const account = { id: created.id, email: created.email, label: razonSocial };
  const data: SolicitudData = { razonSocial, cuit, instagram, localFisico, modalidad, contacto, telefono, ciudad, provincia };

  const token = await createApprovalToken(created.id);
  if (token) {
    const sent = await sendSolicitudAdminEmail(account, data, token);
    // La solicitud igual queda registrada: aunque el aviso falle, aparece en
    // /admin/mayoristas como pendiente. Se avisa fuerte en el log y nada más.
    if (!sent) console.error('[mayorista/solicitud] solicitud creada pero el aviso no salió — customer', created.id);
  } else {
    console.error('[mayorista/solicitud] no se pudo firmar el token de aprobación — revisar WP_SECRET');
  }

  return NextResponse.json({ ok: true });
}
