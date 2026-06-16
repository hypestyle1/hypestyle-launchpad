import { generateEspalda, generateFrente } from '@/lib/estampa';

// Envía al proveedor de estampas (Customland) un mail por pedido con la ficha
// técnica + los archivos de estampa (1:1) de cada ítem personalizado.

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const SUPPLIER_EMAIL = (process.env.SUPPLIER_EMAIL || 'arte@customland.com.ar').trim();
const ADMIN_CC = 'hypestylearg@gmail.com';
const SENDER = { name: 'Hypestyle', email: 'info@hypestyle.com.ar' };
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://hypestyle.com.ar';

type Item = {
  name: string; size?: string; quantity?: number;
  customization?: { playerName?: string; number?: string };
};
type Order = {
  orderNum: string | number;
  nombre?: string; apellido?: string; email?: string;
  items?: Item[];
};

const b64 = (u8: Uint8Array) => Buffer.from(u8).toString('base64');
const isCustom = (it: Item) => !!(it.customization && (it.customization.playerName || it.customization.number));

async function fichaAttachment() {
  try {
    const res = await fetch(`${SITE_URL}/fichas/FICHA-ESTAMPAS-LA-NUESTRA.pdf`, { cache: 'no-store' });
    if (!res.ok) return null;
    return { name: 'FICHA-ESTAMPAS-LA-NUESTRA.pdf', content: b64(new Uint8Array(await res.arrayBuffer())) };
  } catch { return null; }
}

export async function sendSupplierEmail(order: Order): Promise<{ ok: boolean; skip?: string; detail?: any }> {
  if (!BREVO_API_KEY) return { ok: false, skip: 'sin BREVO_API_KEY' };
  const items = (order.items || []).filter(isCustom);
  if (!items.length) return { ok: true, skip: 'sin items personalizados' };

  const attachments: { name: string; content: string }[] = [];
  const ficha = await fichaAttachment();
  if (ficha) attachments.push(ficha);

  const rows: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const nombre = (it.customization?.playerName || '').toUpperCase();
    const numero = (it.customization?.number || '').replace(/\D/g, '');
    const slug = (nombre.replace(/[^A-Z0-9]/g, '') || 'X') + (numero ? '-' + numero : '');
    const [espalda, frente] = await Promise.all([generateEspalda(nombre, numero), generateFrente(numero)]);
    attachments.push({ name: `estampa-espalda-${slug}.pdf`, content: b64(espalda) });
    if (numero) attachments.push({ name: `estampa-frente-${slug}.pdf`, content: b64(frente) });
    rows.push(`<tr>
      <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
      <td style="padding:6px 8px;border:1px solid #eee">${it.size || '-'}</td>
      <td style="padding:6px 8px;border:1px solid #eee;font-weight:bold">${nombre || '-'}</td>
      <td style="padding:6px 8px;border:1px solid #eee;font-weight:bold">${numero || '-'}</td>
    </tr>`);
  }

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
    <h2 style="font-size:16px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #111;padding-bottom:6px">Pedido para estampar — Hypestyle</h2>
    <p style="font-size:13px;line-height:1.6">Entró un pedido con personalización. Adjuntamos la <b>ficha técnica</b> y los <b>archivos de estampa</b> (1:1, vector) en sus medidas correspondientes.</p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin:8px 0">
      <tr><td style="padding:4px 8px;color:#888;width:120px">Pedido</td><td style="padding:4px 8px;font-weight:bold">#${order.orderNum}</td></tr>
      <tr><td style="padding:4px 8px;color:#888">Cliente</td><td style="padding:4px 8px">${order.nombre || ''} ${order.apellido || ''}</td></tr>
    </table>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:6px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Talle</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Nombre</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Número</th>
      </tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
    <p style="font-size:11px;color:#999;margin-top:12px">Imprimir al 100%. Fuente Francia2006 (sin bold), color negro. Curvatura del nombre al vivo del canesú (radio ≈ 112 cm). Dudas: respondé este mail.</p>
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: SUPPLIER_EMAIL, name: 'Estampas' }],
      cc: [{ email: ADMIN_CC, name: 'Hypestyle' }],
      subject: `Pedido #${order.orderNum} para estampar — ${items.length} ${items.length === 1 ? 'prenda' : 'prendas'}`,
      htmlContent: html,
      attachment: attachments,
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    return { ok: false, detail };
  }
  return { ok: true };
}
