'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { imgSrc } from '@/lib/img';
import { Button } from '@/components/ui/button';
import { formatArs } from '@/lib/mayorista-format';
import { useMayoristaCart, lineKey, MayoristaCartItem } from '@/context/MayoristaCartContext';

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

interface ShippingForm {
  first_name: string; last_name: string; company: string;
  address_1: string; city: string; state: string; postcode: string; phone: string;
  dni: string; via_cargo_sucursal: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  first_name: '', last_name: '', company: '', address_1: '', city: '', state: '', postcode: '', phone: '',
  dni: '', via_cargo_sucursal: '',
};

export default function MayoristaCartPage() {
  const { items, remove, setQty, clear, replace, total } = useMayoristaCart();
  const [step, setStep] = useState<'cart' | 'shipping'>('cart');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{ orderNumber: string; items: MayoristaCartItem[]; total: number } | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  // Si el pedido actual salió de un borrador, "guardar" lo pisa en vez de duplicarlo,
  // y al confirmar el pedido ese borrador se elimina solo.
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);

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

  function loadDraft(draft: Draft) {
    if (items.length > 0 && draft.id !== activeDraftId) {
      const ok = window.confirm('Cargar este borrador reemplaza el pedido actual. ¿Continuar?');
      if (!ok) return;
    }
    replace(draft.items);
    setActiveDraftId(draft.id);
    setDraftSavedAt(null);
    setStep('cart');
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
          via_cargo_sucursal: data.viaCargoSucursal || s.via_cargo_sucursal,
        }));
      })
      .catch(() => {});
  }, []);

  const belowMin = minOrder != null && total < minOrder;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/mayorista/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No se pudo enviar el pedido');
      setConfirmed({ orderNumber: data.wcOrderNumber, items, total });
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
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide">Total</span>
            <span className="text-[15px] font-bold">{formatArs(confirmed.total)}</span>
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
          <label className="col-span-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Sucursal de Via Cargo donde querés que lo despachemos
            <input required {...field('via_cargo_sucursal')} placeholder="Ej: Via Cargo Comodoro Rivadavia centro" className="mt-1 w-full bg-transparent border-b border-border px-1 py-2 text-sm focus:outline-none focus:border-foreground transition-colors" />
          </label>
        </div>

        {error && <p className="mt-4 text-[12px] text-destructive">{error}</p>}

        <Button type="submit" variant="hype" size="ctaFull" disabled={sending} className="mt-8 py-3 rounded-full">
          {sending ? 'Enviando…' : `Confirmar pedido — ${formatArs(total)}`}
        </Button>
      </form>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Mi pedido</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={lineKey(item)} className="flex items-center gap-4 rounded-[12px] border border-border p-3">
            <div className="relative w-16 h-16 rounded-[6px] overflow-hidden bg-bg-alt shrink-0">
              {item.image && <Image src={imgSrc(item.image)} alt={item.name} fill sizes="64px" className="object-cover object-top" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-text-light">{item.color ? `${item.color} · ` : ''}Talle {item.size}</p>
              <p className="text-[13px] font-semibold mt-0.5">{formatArs(item.price)}</p>
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

      <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
        <span className="text-[13px] uppercase tracking-wide text-muted-foreground">Total</span>
        <span className="text-xl font-bold">{formatArs(total)}</span>
      </div>

      {belowMin && (
        <p className="mt-3 text-[12px] text-orange-600">
          Pedido mínimo {formatArs(minOrder!)} — te faltan {formatArs(minOrder! - total)}.
        </p>
      )}

      <Button variant="hype" size="ctaFull" onClick={() => setStep('shipping')} disabled={belowMin} className="mt-6 py-3 rounded-full disabled:cursor-not-allowed">
        Continuar
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
