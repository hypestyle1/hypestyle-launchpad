// "Cómo pagar" del pedido mayorista: lo que ve el cliente en la confirmación
// y en el mail del pedido. Hasta el 13/10/2026 el copy prometía "te mandamos
// los datos con el resumen" y el mail no traía ninguno: cada pedido
// necesitaba un WhatsApp a mano para cobrar.
//
// Los datos de la cuenta NO van en el código: salen de variables de entorno
// (Vercel), así se cambian sin deploy y no quedan en el repo. Si faltan, el
// bloque dice que los mandamos por WhatsApp — no se inventa alias ni CBU.
//
//   MAYORISTA_PAGO_ALIAS              alias de la cuenta
//   MAYORISTA_PAGO_CBU                CBU / CVU
//   MAYORISTA_PAGO_TITULAR            titular
//   MAYORISTA_PAGO_CUIT               CUIT del titular
//   MAYORISTA_PAGO_BANCO              banco
//   MAYORISTA_PAGO_PLAZO_RESERVA_DIAS días que se reserva el stock sin pago (número)

import { WHATSAPP_URL } from './mayorista-copy';

export interface PagoInfo {
  alias: string | null;
  cbu: string | null;
  titular: string | null;
  cuit: string | null;
  banco: string | null;
  plazoReservaDias: number | null;
}

const clean = (v: string | undefined): string | null => {
  const s = (v ?? '').replace(/^﻿/, '').trim();
  return s ? s : null;
};

/** Se lee en cada llamada (no al importar) para que los tests y Vercel lo puedan cambiar. */
export function pagoInfoFromEnv(env: Record<string, string | undefined> = process.env): PagoInfo {
  const plazo = Number(clean(env.MAYORISTA_PAGO_PLAZO_RESERVA_DIAS));
  return {
    alias: clean(env.MAYORISTA_PAGO_ALIAS),
    cbu: clean(env.MAYORISTA_PAGO_CBU),
    titular: clean(env.MAYORISTA_PAGO_TITULAR),
    cuit: clean(env.MAYORISTA_PAGO_CUIT),
    banco: clean(env.MAYORISTA_PAGO_BANCO),
    plazoReservaDias: Number.isInteger(plazo) && plazo > 0 ? plazo : null,
  };
}

/** Hay al menos alias o CBU: se pueden mostrar los datos de la cuenta. */
export function isPagoConfigured(info: PagoInfo): boolean {
  return !!(info.alias || info.cbu);
}

/** Datos de la cuenta, solo los cargados, en el orden en que se leen. */
export function pagoDetailLines(info: PagoInfo): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (info.alias) out.push({ label: 'Alias', value: info.alias });
  if (info.cbu) out.push({ label: 'CBU / CVU', value: info.cbu });
  if (info.titular) out.push({ label: 'Titular', value: info.titular });
  if (info.cuit) out.push({ label: 'CUIT', value: info.cuit });
  if (info.banco) out.push({ label: 'Banco', value: info.banco });
  return out;
}

/** Pasos para pagar, en el orden en que se leen. Mismas condiciones que /mayoristas/como-funciona. */
export function pagoSteps(info: PagoInfo): string[] {
  const reserva = info.plazoReservaDias
    ? `Sin pago no reservamos el stock más de ${info.plazoReservaDias} ${info.plazoReservaDias === 1 ? 'día' : 'días'}.`
    : 'Sin pago no se reserva stock por más de unos días.';
  return [
    isPagoConfigured(info)
      ? 'Transferencia bancaria a la cuenta de abajo. Mandanos el comprobante por WhatsApp con el número de pedido.'
      : 'Transferencia bancaria: te mandamos los datos de la cuenta por WhatsApp.',
    'E-cheq para pedidos grandes, a coordinar por WhatsApp.',
    `El pedido se prepara una vez acreditado el pago. ${reserva}`,
    'El envío se paga en destino, salvo que coordinemos otra cosa.',
  ];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Bloque "Cómo pagar" del mail del pedido (HTML inline, como el resto del mail). */
export function pagoHtml(info: PagoInfo, orderNumber: string): string {
  const steps = pagoSteps(info).map(s => `<li style="margin:2px 0">${esc(s)}</li>`).join('');
  const details = pagoDetailLines(info);
  const table = details.length
    ? `<table style="font-size:12px;border-collapse:collapse;margin-top:8px">${details.map(d => `<tr><td style="padding:3px 10px 3px 0;color:#666">${esc(d.label)}</td><td style="padding:3px 0"><b>${esc(d.value)}</b></td></tr>`).join('')}</table>`
    : '';
  return `<div style="margin-top:16px;padding:12px 14px;border:1px solid #ddd;border-radius:8px">
    <p style="font-size:13px;font-weight:bold;margin:0 0 6px">Cómo pagar el pedido #${esc(orderNumber)}</p>
    <ul style="font-size:12px;color:#333;margin:0;padding-left:18px">${steps}</ul>
    ${table}
    <p style="font-size:12px;margin:10px 0 0"><a href="${WHATSAPP_URL}" style="color:#111">Escribinos por WhatsApp</a> para mandar el comprobante o coordinar e-cheq o expreso.</p>
  </div>`;
}
