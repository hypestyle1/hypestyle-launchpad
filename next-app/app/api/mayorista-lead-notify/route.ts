import { NextRequest, NextResponse } from 'next/server';

// Disparado por el workflow de n8n "HYPE - Calificación de clientes
// mayoristas" cuando un lead completa la calificación por IG (status
// ready_for_review). Solo avisa por mail — la cuenta se sigue creando a
// mano desde /admin/mayoristas, no se automatiza el alta.

const WP_SECRET = (process.env.WP_SECRET || '').trim();
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_EMAIL = 'hypestylearg@gmail.com';
const SENDER = { name: 'Hype — Leads mayoristas', email: 'info@hypestyle.com.ar' };

interface Lead {
  sessionId?: string;
  location?: string;
  hasPhysicalStore?: boolean;
  storeName?: string;
  salesMode?: string;
  instagram?: string;
  contactName?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const secret = req.headers.get('x-hypestyle-secret') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (WP_SECRET && token !== WP_SECRET && secret !== WP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const lead = await req.json().catch(() => ({})) as Lead;
  if (!lead.email || !lead.contactName) {
    return NextResponse.json({ error: 'Faltan datos del lead' }, { status: 400 });
  }

  if (!BREVO_API_KEY) return NextResponse.json({ ok: false, skip: 'sin BREVO_API_KEY' });

  const row = (label: string, value?: string) =>
    value ? `<tr><td style="padding:4px 8px;color:#888;width:160px">${label}</td><td style="padding:4px 8px;font-weight:bold">${value}</td></tr>` : '';

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:520px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Nuevo lead mayorista calificado (IG)</h2>
    <table style="font-size:13px;border-collapse:collapse;width:100%;margin-top:8px">
      ${row('Nombre', lead.contactName)}
      ${row('Email', lead.email)}
      ${row('Ubicación', lead.location)}
      ${row('Local físico', lead.hasPhysicalStore ? 'Sí' : 'No')}
      ${row('Nombre del local', lead.storeName)}
      ${row('Modalidad de venta', lead.salesMode)}
      ${row('Instagram', lead.instagram)}
    </table>
    <p style="font-size:13px;margin-top:14px">Está pendiente de aprobación. Para darle acceso, creá el cliente acá:</p>
    <p><a href="https://hypestyle.com.ar/admin/mayoristas" style="font-size:13px">hypestyle.com.ar/admin/mayoristas →</a></p>
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: ADMIN_EMAIL, name: 'Hypestyle' }],
      subject: `Nuevo lead mayorista — ${lead.contactName}`,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    console.error('[mayorista-lead-notify] Brevo error:', detail);
    return NextResponse.json({ ok: false, detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
