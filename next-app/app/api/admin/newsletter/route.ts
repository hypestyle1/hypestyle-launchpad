import { NextRequest, NextResponse } from 'next/server';

const BREVO_KEY    = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_SECRET = process.env.WP_SECRET || '';
const NEWSLETTER_LIST_ID = 3;
const SENDER = { name: 'Hypestyle', email: 'hypestylearg@gmail.com' };

const authed = (req: NextRequest) => {
  const key = req.headers.get('x-admin-key') || '';
  return !ADMIN_SECRET || key === ADMIN_SECRET;
};

// Cantidad de suscriptores de la lista (para mostrar en el composer).
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${NEWSLETTER_LIST_ID}`, {
    headers: { 'api-key': BREVO_KEY }, cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: 'Brevo error' }, { status: 502 });
  const data = await res.json();
  return NextResponse.json({ count: data.totalSubscribers ?? data.uniqueSubscribers ?? 0, name: data.name });
}

// Envía una prueba (test=email) o lanza la campaña a toda la lista.
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { subject, html, test } = await req.json();
  if (!subject || !html) return NextResponse.json({ error: 'subject y html requeridos' }, { status: 400 });

  // Tag de personalización: [nombre] → nombre real de cada suscriptor (Brevo FIRSTNAME).
  // En la prueba se reemplaza por un nombre de muestra para ver cómo queda.
  const nameTag = test ? 'Juan' : '{{ contact.FIRSTNAME }}';
  const subj = String(subject).replace(/\[nombre\]/gi, nameTag);
  const body = String(html).replace(/\[nombre\]/gi, nameTag);

  // Modo prueba: mail transaccional directo al que prueba.
  if (test) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: SENDER, to: [{ email: test }], subject: `[PRUEBA] ${subj}`, htmlContent: body }),
    });
    if (!r.ok) return NextResponse.json({ error: 'Brevo (prueba): ' + JSON.stringify(await r.json().catch(() => ({}))) }, { status: 502 });
    return NextResponse.json({ ok: true, mode: 'test', to: test });
  }

  // Campaña real: crear + enviar ya.
  const create = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:       `Newsletter ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      subject:    subj,
      sender:     SENDER,
      type:       'classic',
      htmlContent: body,
      recipients: { listIds: [NEWSLETTER_LIST_ID] },
    }),
  });
  if (!create.ok) {
    return NextResponse.json({ error: 'Brevo (crear): ' + JSON.stringify(await create.json().catch(() => ({}))) }, { status: 502 });
  }
  const { id } = await create.json();

  const send = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}/sendNow`, {
    method: 'POST', headers: { 'api-key': BREVO_KEY },
  });
  if (!send.ok && send.status !== 204) {
    return NextResponse.json({ error: 'Brevo (enviar): ' + JSON.stringify(await send.json().catch(() => ({}))) }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mode: 'campaign', campaignId: id });
}
