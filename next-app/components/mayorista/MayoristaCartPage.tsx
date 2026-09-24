'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { imgSrc } from '@/lib/img';
import { Button } from '@/components/ui/button';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart, lineKey, MayoristaCartItem } from '@/context/MayoristaCartContext';
import { METODOS_ENVIO, METODO_DEFAULT, metodoDef, validarEnvio, type MetodoEnvio } from '@/lib/mayorista-envio';
import MayoristaMinBar from './MayoristaMinBar';
import { completarMinimo } from '@/lib/mayorista-completar-minimo';
import type { MayoristaProduct } from '@/lib/mayorista-products';

// Precio normal y campaña por línea, según lo que devolvió el servidor
// (/api/mayorista/disponibilidad). El carrito guarda solo el precio vigente.
type LineInfo = { wsRegular: number; campaign?: { id: string; name: string; group: string; discount: number; badge: string } };

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadOrderCsv(orderNumber: string, items: MayoristaCartItem[], total: number) {
  const lines = [['Producto', 'Color', 'Talle', 'Cantidad', 'Precio unitario', 'Subtotal'].join(',')];
  for (const item of items) {
    lines.push([item.name, item.color ?? '', item.size, item.quantity, item.price, item.price * item.quantity].map(csvEscape).join(','));
  }
  lines.push(['', '', '', '', 'Total', total].map(csvEscape).join(','));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedido-${orderNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadOrderPdf(orderNumber: string, clientName: string, email: string, items: MayoristaCartItem[], total: number) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const marginX = 40;
  const colTalle = 340, colCant = 400, colSubtotal = 460;
  const gray = rgb(0.45, 0.45, 0.45);

  let page = doc.addPage(pageSize);
  let y = pageSize[1] - 60;

  function drawHeader() {
    page.drawText('Hype.', { x: marginX, y, size: 20, font: bold });
    page.drawText('MAYORISTAS', { x: marginX + 55, y: y + 6, size: 8, font, color: gray });
    y -= 30;
    page.drawText(`Pedido #${orderNumber}`, { x: marginX, y, size: 14, font: bold });
    y -= 18;
    if (clientName) { page.drawText(clientName, { x: marginX, y, size: 10, font }); y -= 14; }
    if (email) { page.drawText(email, { x: marginX, y, size: 10, font, color: gray }); y -= 14; }
    y -= 10;
    page.drawText('Producto', { x: marginX, y, size: 9, font: bold });
    page.drawText('Talle', { x: colTalle, y, size: 9, font: bold });
    page.drawText('Cant.', { x: colCant, y, size: 9, font: bold });
    page.drawText('Subtotal', { x: colSubtotal, y, size: 9, font: bold });
    y -= 6;
    page.drawLine({ start: { x: marginX, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 14;
  }

  drawHeader();

  for (const item of items) {
    if (y < 80) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - 60;
      drawHeader();
    }
    page.drawText(item.name.slice(0, 40), { x: marginX, y, size: 9, font });
    page.drawText(item.size, { x: colTalle, y, size: 9, font });
    page.drawText(String(item.quantity), { x: colCant, y, size: 9, font });
    page.drawText(formatArs(item.price * item.quantity), { x: colSubtotal, y, size: 9, font });
    if (item.color) {
      y -= 11;
      page.drawText(`Color: ${item.color}`, { x: marginX, y, size: 8, font, color: gray });
    }
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: marginX, y }, end: { x: 555, y }, thickness: 0.8, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText('TOTAL', { x: colCant, y, size: 12, font: bold });
  page.drawText(formatArs(total), { x: colSubtotal, y, size: 12, font: bold });

  const bytes = await doc.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedido-${orderNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Draft {
  id: string;
  name: string;
  items: MayoristaCartItem[];
  updatedAt: string;
}

function draftTotal(d: Draft) {
  return d.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function fmtDraftDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
}

// Una línea cuyo precio cambió entre el carrito y el servidor (misma forma que
// `PriceChange` de lib/mayorista-pricing.ts).
interface PriceChange { slug: string; name: string; size: string; color?: string; quantity: number; before: number | null; after: number }

interface ShippingForm {
  first_name: string; last_name: string; company: string;
  address_1: string; city: string; state: string; postcode: string; phone: string;
  dni: string;
  envio_metodo: MetodoEnvio; envio_destino: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  first_name: '', last_name: '', company: '', address_1: '', city: '', state: '', postcode: '', phone: '',
  dni: '', envio_metodo: METODO_DEFAULT, envio_destino: '',
};

export default function MayoristaCartPage({ catalog = [], campaignName = null }: { catalog?: MayoristaProduct[]; campaignName?: string | null }) {
  const { items, add, remove, setQty, clear, replace, total, hydrated } = useMayoristaCart();
  const [lineInfo, setLineInfo] = useState<Record<string, LineInfo>>({});
  const [step, setStep] = useState<'cart' | 'shipping'>('cart');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  // Destino guardado por método (la sucursal de Via Cargo de siempre, el
  // último expreso, etc.): al cambiar de método se precarga el que corresponde
  // en vez de arrastrar la sucursal de otro servicio.
  const savedDestinos = useRef<Partial<Record<MetodoEnvio, string>>>({});
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // 409 PRICE_CHANGED de /api/mayorista/pedido: precios vigentes + total nuevo,
  // a la espera de que el cliente confirme.
  const [priceChange, setPriceChange] = useState<{ changes: PriceChange[]; total: number } | null>(null);
  const [confirmed, setConfirmed] = useState<{ orderNumber: string; items: MayoristaCartItem[]; total: number; creditUsed: number; campaign?: { name: string; discountTotal: number } | null } | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  // Saldo a favor de la cuenta (nota de crédito): se descuenta solo del pedido.
  const [credit, setCredit] = useState(0);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  // Si el pedido actual salió de un borrador, "guardar" lo pisa en vez de duplicarlo,
  // y al confirmar el pedido ese borrador se elimina solo.
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  // Chequeo de stock contra Woo al hidratar el carrito y al cargar un
  // borrador: lo que ya no está publicado o quedó sin stock se saca solo (o
  // se recorta la cantidad) y se avisa. Hasta el 07/09 un borrador viejo
  // podía llegar a confirmarse con un producto privado y en stock 0.
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockNotice, setStockNotice] = useState<string[]>([]);
  const checkedOnHydrate = useRef(false);

  async function pruneUnavailable(candidate: MayoristaCartItem[]): Promise<MayoristaCartItem[]> {
    if (candidate.length === 0) return candidate;
    setCheckingStock(true);
    try {
      const res = await fetch('/api/mayorista/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: candidate.map(i => ({ slug: i.slug, name: i.name, size: i.size, color: i.color, quantity: i.quantity })) }),
      });
      if (!res.ok) return candidate; // si no se pudo verificar, el pedido igual se frena al confirmar
      const data = await res.json() as {
        unavailable: { slug: string; size: string; color?: string; reason: string; available?: number; message: string }[];
        prices?: { slug: string; size: string; color?: string; unitPrice: number; wsRegular?: number; campaign?: LineInfo['campaign'] }[];
      };
      setLineInfo(Object.fromEntries((data.prices ?? []).map(p => [lineKey(p), { wsRegular: p.wsRegular ?? p.unitPrice, ...(p.campaign ? { campaign: p.campaign } : {}) }])));
      const byKey = new Map((data.unavailable ?? []).map(u => [lineKey(u), u]));
      // El precio guardado en el carrito es una foto de cuando se agregó el
      // ítem; el vigente lo calcula el servidor. Se actualiza acá para que el
      // total que ve el cliente sea el que se va a cobrar.
      const priceByKey = new Map((data.prices ?? []).map(p => [lineKey(p), p.unitPrice]));
      const notices: string[] = [];
      let repriced = 0;
      const next: MayoristaCartItem[] = [];
      for (const item of candidate) {
        const u = byKey.get(lineKey(item));
        const current = priceByKey.get(lineKey(item));
        const withPrice = typeof current === 'number' && current > 0 && current !== item.price ? (repriced++, { ...item, price: current }) : item;
        if (!u) { next.push(withPrice); continue; }
        if (u.reason === 'insufficient' && typeof u.available === 'number' && u.available > 0) {
          next.push({ ...withPrice, quantity: u.available });
          notices.push(`${u.message} Se ajustó la cantidad.`);
        } else {
          notices.push(`${u.message} Se sacó del pedido.`);
        }
      }
      if (repriced) notices.push(`Se actualizó el precio de ${repriced} ${repriced === 1 ? 'producto' : 'productos'} al vigente.`);
      setStockNotice(notices);
      return next;
    } catch {
      return candidate;
    } finally {
      setCheckingStock(false);
    }
  }

  useEffect(() => {
    if (!hydrated || checkedOnHydrate.current) return;
    checkedOnHydrate.current = true;
    pruneUnavailable(items).then((next) => {
      if (next.length !== items.length || next.some((n, i) => n.quantity !== items[i].quantity || n.price !== items[i].price)) replace(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    fetch('/api/mayorista/drafts')
      .then(res => res.ok ? res.json() : null)
      .then(data => setDrafts(data?.drafts ?? []))
      .catch(() => setDrafts([]));
  }, []);

  async function saveDraft() {
    setSavingDraft(true);
    setDraftError('');
    try {
      const res = await fetch('/api/mayorista/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeDraftId ?? undefined, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar el borrador');
      setDrafts(data.drafts);
      setActiveDraftId(data.draft.id);
      setDraftSavedAt(Date.now());
    } catch (e: any) {
      setDraftError(e.message || 'Error al guardar el borrador');
    } finally {
      setSavingDraft(false);
    }
  }

  async function loadDraft(draft: Draft) {
    if (items.length > 0 && draft.id !== activeDraftId) {
      const ok = window.confirm('Cargar este borrador reemplaza el pedido actual. ¿Continuar?');
      if (!ok) return;
    }
    replace(draft.items);
    setActiveDraftId(draft.id);
    setDraftSavedAt(null);
    setStockNotice([]);
    setStep('cart');
    // El borrador puede tener semanas: se revisa contra el stock de hoy.
    const next = await pruneUnavailable(draft.items);
    if (next !== draft.items) replace(next);
  }

  async function deleteDraft(id: string) {
    setDrafts(ds => (ds ?? []).filter(d => d.id !== id));
    if (id === activeDraftId) setActiveDraftId(null);
    try {
      await fetch(`/api/mayorista/drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}
  }

  useEffect(() => {
    fetch('/api/mayorista/perfil')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        if (typeof data.minOrder === 'number') setMinOrder(data.minOrder);
        if (typeof data.credit === 'number') setCredit(data.credit);
        if (data.email) setEmail(data.email);
        const b = data.billing;
        setShipping(s => ({
          ...s,
          first_name: b?.first_name || s.first_name,
          last_name:  b?.last_name  || s.last_name,
          company:    b?.company    || s.company,
          address_1:  b?.address_1  || s.address_1,
          city:       b?.city       || s.city,
          state:      b?.state      || s.state,
          postcode:   b?.postcode   || s.postcode,
          phone:      b?.phone      || s.phone,
          dni:              data.dni              || s.dni,
        }));
        if (data.viaCargoSucursal) savedDestinos.current.via_cargo = data.viaCargoSucursal;
        const metodo = metodoDef(data.envioMetodo)?.id;
        if (metodo && data.envioDestino) savedDestinos.current[metodo] = data.envioDestino;
        const inicial = metodo ?? METODO_DEFAULT;
        setShipping(s => ({ ...s, envio_metodo: inicial, envio_destino: savedDestinos.current[inicial] ?? '' }));
      })
      .catch(() => {});
  }, []);

  const belowMin = minOrder != null && total < minOrder;
  const creditUsed = Math.min(credit, total);
  const toPay = total - creditUsed;

  function elegirEnvio(metodo: MetodoEnvio) {
    setShipping(s => {
      // Lo tipeado para el método actual no se pierde si vuelve a elegirlo.
      savedDestinos.current[s.envio_metodo] = s.envio_destino;
      return { ...s, envio_metodo: metodo, envio_destino: savedDestinos.current[metodo] ?? '' };
    });
  }

  const envioDef = metodoDef(shipping.envio_metodo);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await submitOrder(false);
  }

  // El servidor cobra siempre el precio vigente (50% del PVP de Woo). Si el
  // carrito traía otro, responde 409 PRICE_CHANGED con el total nuevo: se le
  // muestra al cliente y recién con su confirmación se vuelve a mandar.
  async function submitOrder(confirmPrices: boolean) {
    const envioError = validarEnvio(shipping.envio_metodo, shipping.envio_destino);
    if (envioError) { setError(envioError); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/mayorista/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping, ...(confirmPrices ? { confirmPrices: true } : {}) }),
      });
      const data = await res.json();
      if (res.status === 409 && data.code === 'PRICE_CHANGED') {
        const changes = (data.changes ?? []) as PriceChange[];
        // El carrito pasa a los precios vigentes, así el total en pantalla es
        // el que se va a cobrar cuando el cliente confirme.
        const byKey = new Map(changes.map(c => [lineKey(c), c.after]));
        replace(items.map(i => byKey.has(lineKey(i)) ? { ...i, price: byKey.get(lineKey(i))! } : i));
        setPriceChange({ changes, total: Number(data.total) || 0 });
        return;
      }
      if (!res.ok) throw new Error(data.message || 'No se pudo enviar el pedido');
      setPriceChange(null);
      const chargedItems: MayoristaCartItem[] = Array.isArray(data.items)
        ? items.map(i => { const s = data.items.find((x: any) => lineKey(x) === lineKey(i)); return s ? { ...i, price: Number(s.price), quantity: Number(s.quantity) } : i; })
        : items;
      setConfirmed({ orderNumber: data.wcOrderNumber, items: chargedItems, total: Number(data.total) || total, creditUsed: Number(data.creditUsed) || 0, campaign: data.campaign ?? null });
      clear();
      // El borrador ya se convirtió en pedido: se elimina para que la lista
      // muestre solo lo que falta confirmar.
      if (activeDraftId) deleteDraft(activeDraftId);
    } catch (e: any) {
      setError(e.message || 'Error al enviar el pedido');
    } finally {
      setSending(false);
    }
  }

  function field(key: keyof ShippingForm) {
    return {
      value: shipping[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setShipping(s => ({ ...s, [key]: e.target.value })),
    };
  }

  const draftsSection = drafts !== null && drafts.length > 0 && (
    <div className="mt-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Borradores guardados</p>
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.id} className={`rounded-[12px] border p-4 ${d.id === activeDraftId ? 'border-foreground' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate">{d.name}</p>
                <p className="text-[11px] text-text-light mt-0.5">
                  {d.items.length} producto{d.items.length !== 1 ? 's' : ''} · guardado el {fmtDraftDate(d.updatedAt)}
                </p>
              </div>
              <span className="text-[14px] font-bold whitespace-nowrap">{formatArs(draftTotal(d))}</span>
            </div>
            <div className="flex items-center mt-3 pt-3 border-t border-border">
              <button
                onClick={() => loadDraft(d)}
                disabled={d.id === activeDraftId}
                className="text-[11px] font-semibold uppercase tracking-wide px-4 py-1.5 rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-50"
              >
                {d.id === activeDraftId ? 'Cargado en tu pedido' : 'Cargar al pedido'}
              </button>
              <button
                onClick={() => deleteDraft(d.id)}
                className="ml-auto text-[11px] uppercase tracking-wide text-text-light hover:text-destructive transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto px-5 py-16">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pedido enviado</p>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Pedido #{confirmed.orderNumber}</h1>
          <p className="text-[13px] text-muted-foreground mt-3">
            Ya lo recibimos. Te contactamos para coordinar preparación y entrega.
            {email && <> Te mandamos este resumen a <span className="text-foreground">{email}</span>.</>}
          </p>
        </div>

        <div className="rounded-[16px] border border-border bg-bg-alt/50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">Resumen del pedido</p>
          <div className="space-y-2">
            {confirmed.items.map((item) => (
              <div key={lineKey(item)} className="flex items-center justify-between text-[13px]">
                <span className="text-foreground/80">{item.name} <span className="text-text-light">{item.color ? `· ${item.color} ` : ''}· Talle {item.size} · x{item.quantity}</span></span>
                <span className="font-medium">{formatArs(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          {confirmed.campaign && confirmed.campaign.discountTotal > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[13px]">
              <span className="text-foreground/80">Ahorraste con {confirmed.campaign.name}</span>
              <span className="font-medium">−{formatArs(confirmed.campaign.discountTotal)}</span>
            </div>
          )}
          {confirmed.creditUsed > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[13px]">
              <span className="text-foreground/80">Saldo a favor aplicado</span>
              <span className="font-medium">−{formatArs(confirmed.creditUsed)}</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide">{confirmed.creditUsed > 0 ? 'Total a pagar' : 'Total'}</span>
            <span className="text-[15px] font-bold">{formatArs(confirmed.total - confirmed.creditUsed)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => downloadOrderPdf(confirmed.orderNumber, `${shipping.first_name} ${shipping.last_name}`.trim(), email, confirmed.items, confirmed.total)}
            className="text-[12px] font-semibold uppercase tracking-wide py-2.5 rounded-full border border-border hover:border-foreground transition-colors"
          >
            Descargar PDF
          </button>
          <button
            onClick={() => downloadOrderCsv(confirmed.orderNumber, confirmed.items, confirmed.total)}
            className="text-[12px] font-semibold uppercase tracking-wide py-2.5 rounded-full border border-border hover:border-foreground transition-colors"
          >
            Descargar Excel
          </button>
        </div>

        <Button asChild variant="hype" size="ctaFull" className="mt-3 py-3 rounded-full">
          <Link href="/mayoristas">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Todavía no agregaste productos.</p>
          <Button asChild variant="hype" size="cta" className="mt-6 py-3 rounded-full">
            <Link href="/mayoristas">Ir al catálogo</Link>
          </Button>
        </div>
        {draftsSection}
      </div>
    );
  }

  if (step === 'shipping') {
    return (
      <form onSubmit={handleSend} className="max-w-lg mx-auto px-5 sm:px-8 py-8">
        <button type="button" onClick={() => setStep('cart')} className="text-[12px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-6">
          ← Volver al pedido
        </button>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Datos de envío</h1>
        <p className="text-[13px] text-muted-foreground mb-6">Coordinamos la entrega a esta dirección.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Nombre
            <input required {...field('first_name')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Apellido
            <input required {...field('last_name')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            DNI
            <input required {...field('dni')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Teléfono
            <input required {...field('phone')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Local / empresa
            <input {...field('company')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Dirección
            <input required {...field('address_1')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Localidad
            <input required {...field('city')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Provincia
            <input {...field('state')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <label className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            CP
            <input {...field('postcode')} className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
          <fieldset className="col-span-2 mt-3">
            <legend className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Cómo querés recibirlo</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {METODOS_ENVIO.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-[13px] cursor-pointer transition-colors ${
                    shipping.envio_metodo === m.id ? 'border-foreground bg-bg-alt/60 font-medium' : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="envio_metodo"
                    value={m.id}
                    checked={shipping.envio_metodo === m.id}
                    onChange={() => elegirEnvio(m.id)}
                    className="accent-foreground"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
          {envioDef?.destinoLabel ? (
            <label className="col-span-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              {envioDef.destinoLabel}{envioDef.destinoRequerido ? '' : ' (opcional)'}
              <input
                required={envioDef.destinoRequerido}
                {...field('envio_destino')}
                placeholder={envioDef.destinoPlaceholder}
                className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
              />
            </label>
          ) : (
            <p className="col-span-2 text-[12px] text-muted-foreground">Lo mandamos a la dirección de arriba.</p>
          )}
        </div>

        {error && <p className="mt-4 text-[12px] text-destructive">{error}</p>}

        {priceChange && (
          <div className="mt-6 rounded-[12px] border border-foreground p-4">
            <p className="text-[13px] font-semibold">Los precios cambiaron desde que armaste el pedido</p>
            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
              {priceChange.changes.map((c) => (
                <li key={lineKey(c)}>
                  {c.name} · {c.color ? `${c.size} · ${c.color}` : c.size} × {c.quantity}:{' '}
                  {c.before != null ? <><s>{formatArs(c.before)}</s> → </> : null}<span className="text-foreground font-medium">{formatArs(c.after)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px]">Total actualizado: <b>{formatArs(priceChange.total)}</b></p>
            <Button type="button" variant="hype" size="ctaFull" disabled={sending} onClick={() => submitOrder(true)} className="mt-4 py-3 rounded-full">
              {sending ? 'Enviando…' : 'Confirmar con los precios actualizados'}
            </Button>
          </div>
        )}

        <Button type="submit" variant="hype" size="ctaFull" disabled={sending || !!priceChange} className="mt-8 py-3 rounded-full">
          {sending ? 'Enviando…' : `Confirmar pedido — ${formatArs(toPay)}`}
        </Button>
      </form>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Mi pedido</h1>

      {stockNotice.length > 0 && (
        <div className="mb-4 rounded-[12px] border border-orange-300 bg-orange-50 p-4 text-[12px] text-orange-800">
          <p className="font-semibold mb-1">Cambió el stock desde que armaste el pedido</p>
          <ul className="space-y-0.5">
            {stockNotice.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
          <button onClick={() => setStockNotice([])} className="mt-2 text-[11px] uppercase tracking-wide underline">Entendido</button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={lineKey(item)} className="flex items-center gap-4 rounded-[12px] border border-border p-3">
            <div className="relative w-16 h-16 rounded-[6px] overflow-hidden bg-bg-alt shrink-0">
              {item.image && <Image src={imgSrc(item.image)} alt={item.name} fill sizes="64px" className="object-cover object-top" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-text-light">{item.color ? `${item.color} · ` : ''}Talle {item.size}</p>
              {(() => {
                const info = lineInfo[lineKey(item)];
                const promo = info?.campaign && info.wsRegular > item.price;
                return promo ? (
                  <p className="text-[13px] mt-0.5 flex items-baseline gap-2">
                    <span className="font-semibold">{formatArs(item.price)}</span>
                    <span className="text-[11px] text-text-light line-through">{formatArs(info.wsRegular)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-foreground/60">{info.campaign!.badge} −{Math.round(info.campaign!.discount * 100)}%</span>
                  </p>
                ) : <p className="text-[13px] font-semibold mt-0.5">{formatArs(item.price)}</p>;
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(item, item.quantity - 1)} className="w-7 h-7 rounded-[6px] border border-border-mid hover:border-foreground transition-colors">−</button>
              <span className="w-6 text-center text-[13px]">{item.quantity}</span>
              <button onClick={() => setQty(item, item.quantity + 1)} className="w-7 h-7 rounded-[6px] border border-border-mid hover:border-foreground transition-colors">+</button>
            </div>
            <button onClick={() => remove(item)} className="text-text-light hover:text-destructive transition-colors text-[12px] ml-2">✕</button>
          </div>
        ))}
      </div>

      {(() => {
        // Subtotal a mayorista normal y descuento de campaña, desde lo que
        // devolvió el servidor por línea. Sin campaña, solo el total.
        const subtotalNormal = items.reduce((s, i) => s + (lineInfo[lineKey(i)]?.wsRegular ?? i.price) * i.quantity, 0);
        const campaignDiscount = Math.max(0, subtotalNormal - total);
        const name = items.map(i => lineInfo[lineKey(i)]?.campaign?.name).find(Boolean) ?? campaignName ?? 'Liquidación';
        return (
          <div className="mt-6 border-t border-border pt-4 space-y-2">
            {campaignDiscount > 0 && (
              <>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Subtotal a precio mayorista</span>
                  <span className="tabular-nums">{formatArs(subtotalNormal)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-foreground/80">{name}</span>
                  <span className="font-medium tabular-nums">−{formatArs(campaignDiscount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[13px] uppercase tracking-wide text-muted-foreground">{creditUsed > 0 ? 'Subtotal' : 'Total'}</span>
              <span className={creditUsed > 0 ? 'text-[15px] font-semibold' : 'text-xl font-bold'}>{formatArs(total)}</span>
            </div>
            {campaignDiscount > 0 && <p className="text-[12px] text-foreground/70">Ahorrás {formatArs(campaignDiscount)} con {name}.</p>}
            {creditUsed > 0 && (
              <>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-foreground/80">Saldo a favor</span>
                  <span className="font-medium">−{formatArs(creditUsed)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] uppercase tracking-wide text-muted-foreground">Total a pagar</span>
                  <span className="text-xl font-bold">{formatArs(toPay)}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}

      <div className="mt-4">
        <MayoristaMinBar total={total} minOrder={minOrder} />
      </div>

      {belowMin && catalog.length > 0 && (() => {
        const missing = minOrder! - total;
        const suggestions = completarMinimo(catalog, new Set(items.map(i => i.slug)), missing);
        if (!suggestions.length) return null;
        return (
          <div className="mt-4 rounded-[12px] border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completá el mínimo</p>
            <p className="text-[12px] text-foreground/70 mt-0.5">Te faltan {formatArs(missing)}. Estos suman rápido:</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {suggestions.map(s => (
                <button
                  key={s.slug}
                  onClick={() => add({ slug: s.slug, name: s.name, price: s.unitPrice, image: s.image, size: s.size, ...(s.color ? { color: s.color } : {}), quantity: 1 })}
                  className="text-left rounded-[10px] border border-border p-2 hover:border-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 rounded-[6px] overflow-hidden bg-bg-alt shrink-0">
                      {s.image && <Image src={imgSrc(s.image)} alt="" fill sizes="40px" className="object-cover object-top" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-text-light">Talle {s.size}{s.color ? ` · ${s.color}` : ''}</p>
                      <p className="text-[12px] font-semibold tabular-nums">{formatArs(s.unitPrice)}{s.promo && <span className="ml-1 text-[10px] font-normal uppercase tracking-wide text-foreground/60">liquidación</span>}</p>
                    </div>
                  </div>
                  <span className="mt-1.5 block text-[10px] uppercase tracking-wide text-foreground/60">+ Agregar</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <Button variant="hype" size="ctaFull" onClick={() => setStep('shipping')} disabled={belowMin || checkingStock} className="mt-6 py-3 rounded-full disabled:cursor-not-allowed">
        {checkingStock ? 'Verificando stock…' : 'Continuar'}
      </Button>
      <button
        onClick={saveDraft}
        disabled={savingDraft}
        className="mt-3 w-full text-[11px] font-semibold uppercase tracking-wide py-2.5 rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-50"
      >
        {savingDraft ? 'Guardando…' : activeDraftId ? 'Actualizar borrador' : 'Guardar como borrador'}
      </button>
      {draftError && <p className="mt-2 text-[12px] text-destructive text-center">{draftError}</p>}
      {draftSavedAt !== null && !draftError && (
        <p className="mt-2 text-[12px] text-muted-foreground text-center">
          Borrador guardado. Podés seguir sumando productos y confirmarlo cuando quieras.
        </p>
      )}
      <button
        onClick={() => { clear(); setActiveDraftId(null); setDraftSavedAt(null); }}
        className="mt-3 w-full text-[11px] uppercase tracking-wide text-text-light hover:text-destructive transition-colors py-2"
      >
        Vaciar pedido
      </button>

      {draftsSection}
    </div>
  );
}
