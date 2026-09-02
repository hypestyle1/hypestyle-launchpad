import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const WP_SECRET     = process.env.WP_SECRET || '';
// Remitente en el dominio autenticado en Brevo (desde un Gmail, Brevo reescribe
// el From a @brevosend.com y el mail sale de Principal).
const SENDER_EMAIL  = 'info@hypestyle.com.ar';
const SENDER_NAME   = 'Hypestyle';
const REPLY_TO      = 'hypestylearg@gmail.com';

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization') || '';
  const secret = req.headers.get('x-hypestyle-secret') || '';
  const token  = auth.replace(/^Bearer\s+/i, '');
  if (!WP_SECRET || (token !== WP_SECRET && secret !== WP_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { to, subject, message, content_type } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const isHtml = (content_type || '').includes('html');

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
        replyTo:     { name: SENDER_NAME, email: REPLY_TO },
        to:          [{ email: to.trim() }],
        subject,
        ...(isHtml ? { htmlContent: message } : { textContent: message }),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[wp-mail] brevo error:', err);
      return NextResponse.json({ error: 'Brevo error', detail: err }, { status: 500 });
    }

    console.log(`[wp-mail] sent to ${to} — "${subject}"`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[wp-mail]', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
