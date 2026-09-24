import { NextRequest, NextResponse } from 'next/server';
import { MAYORISTA_COOKIE, verifySessionToken } from '@/lib/mayorista-auth';
import { formatArs } from '@/lib/mayorista-format';
import { getGlobalMinOrder, customerMinOrderOverride } from '@/lib/mayorista-settings';
import { wcAuth, wcGet, resolveProducts, findVariation, findUnavailable } from '@/lib/mayorista-stock';
import { priceLines } from '@/lib/mayorista-pricing';
import { applyCampaign, type WholesaleCampaign } from '@/lib/wholesale-campaigns';
import { readCampaigns } from '@/lib/wholesale-campaigns-store';
import { parseCredit, creditToApply, addMovement, creditMetaEntry } from '@/lib/mayorista-credit';
import { metodoDef, validarEnvio, envioResumen, envioOrderMeta, METODO_DEFAULT, type MetodoEnvio } from '@/lib/mayorista-envio';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
const ADMIN_EMAIL = 'hypestylearg@gmail.com';
const SENDER = { name: 'Hypestyle Mayoristas', email: 'info@hypestyle.com.ar' };

interface PedidoItem {
  slug: string;
  name: string;
  price: number;
  size: string;
  // Color elegido en el catálogo (productos con atributo Color en Woo).
  color?: string;
  quantity: number;
  // Solo en las líneas ya cobradas (para los mails): mayorista normal y, si
  // hubo campaña, el descuento aplicado.
  wsRegular?: number;
  campaignDiscount?: number;
  campaignName?: string;
}

// Celda "Talle" de los mails: talle y, si lo hay, color.
function sizeLabel(it: PedidoItem): string {
  return it.color ? `${it.size} · ${it.color}` : it.size;
}

// Celda "Precio" de los mails: con campaña, el mayorista normal tachado y el
// precio cobrado con el % extra.
function priceCell(it: PedidoItem): string {
  if (it.wsRegular && it.campaignDiscount && it.wsRegular > it.price) {
    return `<s style="color:#888">${formatArs(it.wsRegular)}</s> <b>${formatArs(it.price)}</b> <span style="color:#888;font-size:11px">−${Math.round(it.campaignDiscount * 100)}%</span>`;
  }
  return formatArs(it.price);
}

interface ShippingInfo {
  first_name: string; last_name: string; company?: string;
  address_1: string; address_2?: string; city: string; state?: string;
  postcode?: string; country?: string; phone: string;
  dni: string;
  // Cómo lo quiere recibir (ver lib/mayorista-envio). via_cargo_sucursal queda
  // por compatibilidad con un carrito viejo abierto antes del cambio.
  envio_metodo?: MetodoEnvio; envio_destino?: string;
  via_cargo_sucursal?: string;
}

// Líneas de total de los mails: si se usó saldo a favor, se muestra el
// subtotal, el descuento y lo que queda a pagar.
function totalsHtml(total: number, credit: number, campaign?: { name: string; discountTotal: number }): string {
  // Con campaña: el subtotal a mayorista normal, el descuento de la campaña y
  // el total ya con descuento (que es `total`).
  const campaignRows = campaign && campaign.discountTotal > 0
    ? `<p style="font-size:13px;margin-top:10px;margin-bottom:2px">Subtotal a precio mayorista: ${formatArs(total + campaign.discountTotal)}</p>
    <p style="font-size:13px;margin:2px 0">${campaign.name}: −${formatArs(campaign.discountTotal)}</p>`
    : '';
  if (!credit) return `${campaignRows}<p style="font-size:13px;margin-top:${campaignRows ? 2 : 10}px">Total: <b>${formatArs(total)}</b></p>`;
  return `${campaignRows}<p style="font-size:13px;margin-top:${campaignRows ? 2 : 10}px;margin-bottom:2px">Subtotal: ${formatArs(total)}</p>
    <p style="font-size:13px;margin:2px 0">Saldo a favor aplicado: −${formatArs(credit)}</p>
    <p style="font-size:13px;margin-top:2px">Total a pagar: <b>${formatArs(total - credit)}</b></p>`;
}

// Normaliza el envío: un carrito viejo solo manda via_cargo_sucursal.
function envioDe(shipping: ShippingInfo): { metodo: MetodoEnvio; destino: string } {
  if (shipping.envio_metodo) return { metodo: shipping.envio_metodo, destino: (shipping.envio_destino ?? '').trim() };
  return { metodo: METODO_DEFAULT, destino: (shipping.via_cargo_sucursal ?? '').trim() };
}

// Guarda la dirección/DNI/sucursal cargados en este pedido como perfil del
// cliente, para que /api/mayorista/perfil los precargue de ahí en adelante
// — así los tiene que tipear una vez por cuenta (y puede corregirlos en
// cualquier pedido posterior, el formulario sigue editable). dni/sucursal
// van sin guión bajo en meta_data: WC descarta en silencio los meta
// "protegidos" al actualizar un customer por REST.
async function saveCustomerProfile(customerId: number, billing: Record<string, unknown>, dni: string, envio: { metodo: MetodoEnvio; destino: string }) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
    body: JSON.stringify({
      billing,
      shipping: { ...billing, phone: undefined },
      meta_data: [
        { key: 'dni', value: dni },
        { key: 'mayorista_envio_metodo', value: envio.metodo },
        { key: 'mayorista_envio_destino', value: envio.destino },
        // La sucursal de Via Cargo se guarda aparte para no pisarla si un
        // pedido suelto sale por otro lado.
        ...(envio.metodo === 'via_cargo' ? [{ key: 'via_cargo_sucursal', value: envio.destino }] : []),
      ],
    }),
  });
  if (!res.ok) console.error('[mayorista/pedido] no se pudo guardar el perfil del cliente:', res.status);
}

type CampaignSummary = { id: string; name: string; discountTotal: number } | null;

async function sendAdminEmail(label: string, shipping: ShippingInfo, items: PedidoItem[], total: number, credit: number, orderNumber: string, campaign: CampaignSummary) {
  if (!BREVO_API_KEY) return;
  const rows = items.map(it => `<tr>
    <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${sizeLabel(it)}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.quantity}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${priceCell(it)}</td>
  </tr>`).join('');

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Pedido mayorista — Hype.</h2>
    <p style="font-size:13px">Cliente: <b>${label}</b> — DNI ${shipping.dni}</p>
    <p style="font-size:12px;color:#444">${shipping.address_1}, ${shipping.city} ${shipping.state ?? ''} — ${shipping.phone}</p>
    <p style="font-size:12px;color:#444">Envío: <b>${envioResumen(envioDe(shipping).metodo, envioDe(shipping).destino)}</b></p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Talle</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Cant.</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Precio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsHtml(total, credit, campaign)}
    <p style="font-size:12px;color:#888">Orden WooCommerce #${orderNumber} (on-hold).</p>
  </div>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: ADMIN_EMAIL, name: 'Hypestyle' }],
      subject: `Pedido mayorista #${orderNumber} — ${label}`,
      htmlContent: html,
    }),
  }).catch((e) => console.error('[mayorista/pedido] email error:', e));
}

// Copia del resumen para el cliente — así queda guardado en su propio mail
// (el carrito no persiste después de confirmar, y no hay checkout/pago para
// que quede un comprobante de esa instancia).
async function sendCustomerEmail(toEmail: string, items: PedidoItem[], total: number, credit: number, orderNumber: string, envio: string, campaign: CampaignSummary) {
  if (!BREVO_API_KEY || !toEmail) return;
  const rows = items.map(it => `<tr>
    <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${sizeLabel(it)}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${it.quantity}</td>
    <td style="padding:6px 8px;border:1px solid #eee">${priceCell(it)}</td>
  </tr>`).join('');

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:600px">
    <h2 style="font-size:16px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px">Hype. — Resumen de tu pedido</h2>
    <p style="font-size:13px">Recibimos tu pedido <b>#${orderNumber}</b>. Te contactamos para coordinar preparación y entrega.</p>
    <p style="font-size:12px;color:#444">Envío: <b>${envio}</b></p>
    <table style="font-size:12px;border-collapse:collapse;width:100%;margin-top:8px">
      <thead><tr style="background:#f2f2f2">
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Producto</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Talle</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Cant.</th>
        <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Precio</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsHtml(total, credit, campaign)}
  </div>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: toEmail }],
      subject: `Tu pedido #${orderNumber} — Hype.`,
      htmlContent: html,
    }),
  }).catch((e) => console.error('[mayorista/pedido] customer email error:', e));
}

export async function POST(req: NextRequest) {
  const customerId = await verifySessionToken(req.cookies.get(MAYORISTA_COOKIE)?.value);
  if (!customerId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { items: rawItems, shipping, confirmPrices } = await req.json() as { items: PedidoItem[]; shipping: ShippingInfo; confirmPrices?: boolean };
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ message: 'El pedido está vacío' }, { status: 400 });
    }
    if (!shipping?.first_name || !shipping?.address_1 || !shipping?.city || !shipping?.phone || !shipping?.dni) {
      return NextResponse.json({ message: 'Faltan datos de envío' }, { status: 400 });
    }
    const envio = envioDe(shipping);
    const envioError = validarEnvio(envio.metodo, envio.destino);
    if (envioError) return NextResponse.json({ message: envioError }, { status: 400 });
    // Andreani a domicilio no lleva destino: que no se cuele uno viejo.
    if (!metodoDef(envio.metodo)?.destinoLabel) envio.destino = '';

    // Del body solo se usan slug/talle/color/cantidad. El precio y cualquier
    // id de variación que venga del navegador NO se usan para cobrar: el
    // producto y la variación se resuelven acá contra Woo y el precio se
    // calcula acá (lib/mayorista-pricing.ts).
    const items: PedidoItem[] = rawItems.map((i: any) => ({
      slug: String(i?.slug ?? ''),
      name: String(i?.name ?? i?.slug ?? ''),
      size: String(i?.size ?? ''),
      ...(i?.color ? { color: String(i.color) } : {}),
      quantity: Math.max(1, Math.floor(Number(i?.quantity) || 1)),
      price: Number(i?.price),
    }));

    const resolvedBySlug = await resolveProducts(items.map(i => i.slug));

    // Lo que el catálogo ya no ofrece (producto despublicado o borrado, talle
    // sin stock) no puede entrar en la orden aunque siga en el carrito o en un
    // borrador viejo. El carrito ya se sanea solo (/api/mayorista/disponibilidad)
    // pero esto es la última barrera: se avisa todo junto.
    const unavailable = findUnavailable(items, resolvedBySlug);
    if (unavailable.length) {
      return NextResponse.json(
        { message: `${unavailable.map(u => u.message).join(' ')} Sacalo del pedido e intentá de nuevo.`, unavailable },
        { status: 409 },
      );
    }

    const basePricing = priceLines(items, resolvedBySlug);
    if (basePricing.unpriced.length) {
      // Sin regular_price en Woo no hay precio mayorista: no se inventa uno.
      return NextResponse.json(
        { message: `${basePricing.unpriced.map(u => `${u.name} (${u.size}) no tiene precio cargado.`).join(' ')} Avisanos y lo resolvemos.`, unpriced: basePricing.unpriced },
        { status: 409 },
      );
    }

    // Campañas mayoristas (Wholesale Campaigns): el descuento extra se aplica
    // acá, sobre el mayorista normal, con la vigencia decidida ahora mismo. Si
    // WP no responde no se asume "sin campaña": cobrar precio normal en medio
    // de una liquidación es un error comercial, mejor pedir reintento.
    let campaigns: WholesaleCampaign[];
    try {
      campaigns = await readCampaigns();
    } catch (err) {
      console.error('[mayorista/pedido] no se pudieron leer las campañas:', err);
      return NextResponse.json({ message: 'No pudimos verificar las promociones vigentes. Esperá unos segundos e intentá de nuevo.' }, { status: 502 });
    }
    const pricing = applyCampaign(basePricing, campaigns);

    // El carrito traía otro precio (borrador viejo, cambio de PVP, campaña que
    // arrancó o venció, o alguien tocó el request): se devuelve el total
    // vigente y se pide confirmación. Con `confirmPrices: true` el pedido
    // sigue, siempre con los precios del servidor.
    if (pricing.changes.length && confirmPrices !== true) {
      return NextResponse.json(
        {
          code: 'PRICE_CHANGED',
          message: 'Los precios de tu pedido cambiaron desde que lo armaste. Revisá el total actualizado y confirmá.',
          changes: pricing.changes,
          total: pricing.total,
          discountTotal: pricing.discountTotal,
          campaignIds: pricing.campaignIds,
        },
        { status: 409 },
      );
    }

    const appliedCampaign = pricing.lines.find(l => l.campaign)?.campaign ?? null;
    const campaignSummary: CampaignSummary = appliedCampaign
      ? { id: appliedCampaign.campaignId, name: appliedCampaign.campaignName, discountTotal: pricing.discountTotal }
      : null;

    // Para los mails: las líneas con el precio que efectivamente se cobra.
    const pricedItems: PedidoItem[] = pricing.lines.map(l => ({
      slug: l.slug, name: l.name, size: l.size, ...(l.color ? { color: l.color } : {}), quantity: l.quantity, price: l.unitPrice,
      wsRegular: l.wsRegular,
      ...(l.campaign ? { campaignDiscount: l.campaign.discount, campaignName: l.campaign.campaignName } : {}),
    }));

    const lineItems = pricing.lines.map((line) => {
      const resolved = resolvedBySlug.get(line.slug)!;
      const color = line.color ?? '';
      const hit = findVariation(resolved, line);
      const lineTotal = String(line.lineTotal);
      // Lo que no quedó representado por la variación va como meta visible en
      // la orden: el talle si no matcheó ninguna, y el color siempre que la
      // variación no lo lleve (caso AERO: una sola entrada en Woo, el color es
      // un dato del pedido). Antes se perdía en silencio y el admin no sabía
      // qué talle era.
      const meta: { key: string; value: string }[] = [];
      if (!hit) meta.push({ key: 'Talle', value: line.size });
      if (color && !(hit && hit.options.includes(color.toLowerCase()))) meta.push({ key: 'Color', value: color });
      // Trazabilidad de precio por línea (con guión bajo: no se muestra al
      // cliente en Woo, la lee el admin y la medición de campañas).
      meta.push({ key: '_ws_regular', value: String(line.wsRegular) });
      meta.push({ key: '_ws_final', value: String(line.unitPrice) });
      if (line.campaign) {
        meta.push({ key: '_ws_campaign_id', value: line.campaign.campaignId });
        meta.push({ key: '_ws_campaign_group', value: line.campaign.group });
        meta.push({ key: '_ws_campaign_discount', value: String(line.campaign.discount) });
      }
      return {
        product_id: line.productId,
        ...(line.variationId ? { variation_id: line.variationId } : {}),
        quantity: line.quantity,
        subtotal: lineTotal,
        total: lineTotal,
        meta_data: meta,
      };
    });

    const total = pricing.total;

    const customer = await wcGet(`customers/${customerId}?_fields=meta_data,email`);
    // Mínimo: el override del cliente manda; si no, el mínimo propio de la
    // campaña aplicada; si no, el general.
    const campaignMin = appliedCampaign ? campaigns.find(c => c.id === appliedCampaign.campaignId)?.minOrder ?? null : null;
    const minOrder = customerMinOrderOverride(customer.meta_data) ?? campaignMin ?? await getGlobalMinOrder();
    if (total < minOrder) {
      return NextResponse.json({ message: `El pedido mínimo es ${formatArs(minOrder)}` }, { status: 400 });
    }

    // Saldo a favor (nota de crédito): se descuenta solo, hasta cubrir el
    // pedido. El mínimo se sigue midiendo sobre el pedido bruto.
    const credit = parseCredit(customer.meta_data);
    const creditUsed = creditToApply(credit.saldo, total);

    const label = shipping.company || `${shipping.first_name} ${shipping.last_name}`.trim();

    const billing = {
      first_name: shipping.first_name,
      last_name:  shipping.last_name,
      company:    shipping.company ?? '',
      address_1:  shipping.address_1,
      address_2:  shipping.address_2 ?? '',
      city:       shipping.city,
      state:      shipping.state ?? '',
      postcode:   shipping.postcode ?? '',
      country:    shipping.country ?? 'AR',
      phone:      shipping.phone,
    };

    const order = {
      customer_id:          customerId,
      status:                'on-hold',
      payment_method:        'mayorista',
      payment_method_title:  'Pedido mayorista',
      set_paid:              false,
      billing,
      shipping:              { ...billing, phone: undefined },
      line_items:            lineItems,
      // Fee negativo: WC lo resta del total de la orden y queda a la vista en
      // el detalle del pedido.
      ...(creditUsed ? { fee_lines: [{ name: 'Saldo a favor', total: String(-creditUsed), tax_status: 'none' }] } : {}),
      meta_data: [
        ...(creditUsed ? [{ key: '_mayorista_credito_aplicado', value: String(creditUsed) }] : []),
        ...(campaignSummary ? [
          { key: '_wholesale_campaign_id', value: campaignSummary.id },
          { key: '_wholesale_campaign_name', value: campaignSummary.name },
          { key: '_wholesale_campaign_discount_total', value: String(campaignSummary.discountTotal) },
        ] : []),
        { key: '_es_mayorista', value: 'true' },
        { key: '_billing_dni', value: shipping.dni },
        ...envioOrderMeta(envio.metodo, envio.destino),
      ],
    };

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
      body: JSON.stringify(order),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[mayorista/pedido] WC error:', res.status, txt);
      return NextResponse.json({ message: `Error de WooCommerce (${res.status})` }, { status: 502 });
    }

    const wcOrder = await res.json() as { id: number; number: string };

    // Con la orden ya creada, se descuenta el saldo usado. Si falla, la orden
    // queda igual (el crédito ya se aplicó en ella) y se avisa en el log para
    // corregir el saldo a mano.
    if (creditUsed) {
      const next = addMovement(credit, {
        fecha: new Date().toISOString(),
        monto: -creditUsed,
        motivo: 'Aplicado a pedido',
        orden: String(wcOrder.number),
      });
      const upd = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: wcAuth() },
        body: JSON.stringify({ meta_data: [creditMetaEntry(next)] }),
      }).catch(() => null);
      if (!upd?.ok) console.error(`[mayorista/pedido] orden #${wcOrder.number} usó ${creditUsed} de saldo pero no se pudo descontar del cliente ${customerId}`);
    }

    await Promise.all([
      sendAdminEmail(label, shipping, pricedItems, total, creditUsed, String(wcOrder.number), campaignSummary),
      sendCustomerEmail(customer.email, pricedItems, total, creditUsed, String(wcOrder.number), envioResumen(envio.metodo, envio.destino), campaignSummary),
      saveCustomerProfile(customerId, billing, shipping.dni, envio),
    ]);

    return NextResponse.json({
      wcOrderId: wcOrder.id, wcOrderNumber: String(wcOrder.number), creditUsed,
      // Lo que se cobró, para que la confirmación en pantalla muestre lo mismo
      // que la orden aunque el carrito tuviera otro precio.
      total, items: pricedItems,
      campaign: campaignSummary,
    });
  } catch (err) {
    console.error('[mayorista/pedido]', err);
    return NextResponse.json({ message: 'Error al crear el pedido. Tu pedido sigue cargado: esperá unos segundos e intentá de nuevo.' }, { status: 500 });
  }
}
