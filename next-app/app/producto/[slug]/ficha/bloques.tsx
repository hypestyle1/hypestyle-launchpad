'use client';

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { type Product } from '@/data/products';
import StockAlertForm from '@/components/StockAlertForm';
import { getPublicReviewSummary } from '@/lib/reviews/public';
import { normalizeCpAr } from '@/lib/postal-code';
import {
  FREE_SHIPPING_THRESHOLD, costoEnvio, modoDeTarifa, ordenarTarifas, type TarifaEnvio,
} from '@/lib/envio';
import { DESPACHO_HORAS_HABILES, ENTREGA_DIAS_HABILES, ventanaEntrega, type Modelo } from '@/lib/ficha';

/** Todo lo que una variante necesita de ProductoClient, que sigue siendo dueño del estado. */
export interface FichaProps {
  product: Product;
  galleryImages: string[];
  selectedImage: number;
  onSelectImage: (i: number) => void;
  onOpenGallery: () => void;
  /** La galería de la ficha actual (tira de miniaturas + foto con zoom). */
  galeriaClasica: ReactNode;
  descripcion: string;
  modelInfo?: ReactNode;
  displayPrice: number;
  displayOriginal?: number | null;
  transferPrice: number;
  transferRate: number;
  mounted: boolean;
  selectedColor: string;
  selectedSize: string | null;
  onSelectSize: (s: string) => void;
  liveOutSizes: Set<string>;
  sizeError: boolean;
  stockError: boolean;
  stockChecking: boolean;
  onAdd: () => void;
  onTransfer: () => void;
  onSizeGuide: () => void;
  sizeGuideImage?: string;
  addBtnRef: RefObject<HTMLButtonElement>;
  primaryBtnClass: string;
  modelo: Modelo | null;
  onModelo: (m: Modelo) => void;
  related: ReactNode;
}

export function imgUrl(src: string): string {
  if (!src) return '';
  const s = src.replace('http://hypestyle.local', 'https://lightpink-rook-704850.hostingersite.com');
  return s.startsWith('http') ? s : `/${s}`;
}

export function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src || '');
}

export function Foto({ src, alt, sizes, priority, className = 'object-cover object-top' }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return isVideo(src)
    ? <video src={imgUrl(src)} autoPlay muted loop playsInline className={`absolute inset-0 w-full h-full ${className}`} />
    : <Image src={imgUrl(src)} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
}

export function Migas({ product }: { product: Product }) {
  const { t } = useLocale();
  return (
    <p className="text-[12px] text-muted-foreground">
      <a href="/productos/" className="hover:text-foreground transition-colors">{t(product.category)}</a>
      {' / '}
      <span className="text-foreground">{product.name}</span>
    </p>
  );
}

export function Precio({ p, grande = false }: { p: FichaProps; grande?: boolean }) {
  const { formatPrice } = useLocale();
  return (
    <div className="flex items-baseline gap-3">
      <span className={`${grande ? 'text-[24px]' : 'text-[20px]'} font-semibold tabular-nums`}>
        {p.mounted ? formatPrice(p.displayPrice) : '—'}
      </span>
      {p.displayOriginal && p.mounted && (
        <span className="text-[15px] text-muted-foreground line-through tabular-nums">{formatPrice(p.displayOriginal)}</span>
      )}
    </div>
  );
}

/** Cuotas y transferencia en una línea, debajo del precio. */
export function LineaPagos({ p }: { p: FichaProps }) {
  const { formatPrice, currency, t } = useLocale();
  if (!p.mounted || currency !== 'ARS') return null;
  return (
    <p className="text-[12px] text-muted-foreground">
      {t('3 cuotas sin interés de')} <span className="font-semibold text-foreground tabular-nums">{formatPrice(Math.round(p.displayPrice / 3))}</span>
      {' · '}
      <span className="font-semibold text-foreground tabular-nums">{formatPrice(p.transferPrice)}</span> {t('por transferencia')}
    </p>
  );
}

/** Medios de pago como tabla. Transferencia primero: es el medio que mejor cobra. */
export function TablaPagos({ p }: { p: FichaProps }) {
  const { formatPrice, currency, t } = useLocale();
  if (!p.mounted || currency !== 'ARS') return null;
  return (
    <div className="text-[13px]">
      <div className="flex justify-between gap-3 py-2.5 border-b border-border">
        <span>{t('Transferencia')} <span className="text-green-700 font-semibold">{p.transferRate}% off</span></span>
        <span className="font-semibold tabular-nums">{formatPrice(p.transferPrice)}</span>
      </div>
      <div className="flex justify-between gap-3 py-2.5 border-b border-border">
        <span>{t('Tarjeta de crédito, 3 cuotas sin interés')}</span>
        <span className="font-semibold tabular-nums">3 x {formatPrice(Math.round(p.displayPrice / 3))}</span>
      </div>
    </div>
  );
}

export function SelectorColor({ p }: { p: FichaProps }) {
  const { t } = useLocale();
  const router = useRouter();
  const { product } = p;
  if (product.colors.length <= 1) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[12px] text-muted-foreground">
        {t('Color')} <span className="text-foreground">— {p.selectedColor}</span>
      </p>
      <div className="flex gap-2 flex-wrap">
        {product.colors.map(c => (
          <button key={c.label} title={c.label}
            onClick={() => { if (c.slug && c.slug !== product.slug) router.push(`/producto/${c.slug}/`); }}
            className={`relative w-[56px] h-[72px] overflow-hidden bg-bg-alt border-b-2 transition-colors ${c.slug === product.slug || p.selectedColor === c.label ? 'border-foreground' : 'border-transparent hover:border-foreground/40'}`}>
            {c.image && <Image src={imgUrl(c.image)} alt={c.label} fill sizes="56px" className="object-cover" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SelectorTalle({ p, guia = true }: { p: FichaProps; guia?: boolean }) {
  const { t } = useLocale();
  const { product, selectedSize, liveOutSizes } = p;
  const esColor = !!product.colorVariant;
  const agotados = product.sizes.filter(s => product.stock[s] === 'out' || liveOutSizes.has(s));

  if (product.sizes.length === 1 && !esColor) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {t('Talle')} <span className="text-foreground font-semibold">{t('Único')}{product.sizeEquivalent ? ` · ${t('equivale a un')} ${product.sizeEquivalent}` : ''}</span>
      </p>
    );
  }

  const estado = selectedSize ? product.stock[selectedSize] : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          {t(esColor ? 'Color' : 'Talle')}
          {!esColor && product.category !== 'Accesorio' && <> · Fit <span className="text-foreground">{t(product.fit)}</span></>}
        </p>
        {guia && (
          <button onClick={p.onSizeGuide} className="text-[12px] underline underline-offset-[3px] text-muted-foreground hover:text-foreground transition-colors">
            {t('Guía de talles')}
          </button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {product.sizes.map(s => {
          const out = product.stock[s] === 'out' || liveOutSizes.has(s);
          return (
            <button key={s} disabled={out} aria-pressed={selectedSize === s}
              onClick={() => p.onSelectSize(s)}
              className={`min-w-[46px] h-10 px-3 text-[12px] font-semibold uppercase border transition-colors rounded-[10px] ${
                out ? 'border-border text-foreground/25 line-through cursor-not-allowed'
                : selectedSize === s ? 'border-foreground bg-foreground text-background'
                : 'border-border hover:border-foreground'
              }`}>
              {s}
            </button>
          );
        })}
      </div>
      {estado === 'low' && !liveOutSizes.has(selectedSize!) && (
        <p className="text-[11px] text-amber-600 font-medium">{t('Últimas unidades disponibles')}</p>
      )}
      {p.stockError && <p className="text-[11px] text-destructive">{t(esColor ? 'Este color ya no tiene stock disponible' : 'Este talle ya no tiene stock disponible')}</p>}
      {p.sizeError && !p.stockError && <p className="text-[11px] text-destructive">{t(esColor ? 'Seleccioná un color para continuar' : 'Seleccioná un talle para continuar')}</p>}
      {agotados.length > 0 && (
        <StockAlertForm key={product.slug} slug={product.slug} sizes={agotados} isColorVariant={esColor} />
      )}
    </div>
  );
}

/** El plazo de despacho, pegado al botón de compra. */
export function LineaDespacho() {
  const { t } = useLocale();
  return (
    <p className="flex items-baseline gap-2 text-[12px] text-muted-foreground">
      <span className="w-[7px] h-[7px] rounded-full bg-green-700 flex-shrink-0 -translate-y-px" />
      <span>{t('Despachamos dentro de las')} {DESPACHO_HORAS_HABILES} {t('h hábiles de confirmado el pago.')}</span>
    </p>
  );
}

/** Agregar al carrito con el precio adentro del botón. */
export function BotonComprar({ p, conPrecio = true }: { p: FichaProps; conPrecio?: boolean }) {
  const { formatPrice, t } = useLocale();
  return (
    <button ref={p.addBtnRef} onClick={p.onAdd} disabled={p.stockChecking}
      className={`w-full h-[54px] px-5 flex items-center ${conPrecio ? 'justify-between' : 'justify-center'} gap-3 ${p.primaryBtnClass} text-primary-foreground text-[13px] font-bold uppercase tracking-[0.1em] rounded-[10px] transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed`}>
      <span>{p.stockChecking ? t('Verificando stock...') : t('Agregar al carrito')}</span>
      {conPrecio && <span className="tabular-nums tracking-[0.02em]">{p.mounted ? formatPrice(p.displayPrice) : ''}</span>}
    </button>
  );
}

/** Segundo botón: agrega y va directo al checkout para pagar por transferencia. */
export function BotonTransferencia({ p }: { p: FichaProps }) {
  const { formatPrice, currency, t } = useLocale();
  if (!p.mounted || currency !== 'ARS') return null;
  return (
    <button onClick={p.onTransfer} disabled={p.stockChecking}
      className="w-full h-[50px] px-5 flex items-center justify-between gap-3 border border-foreground text-[12px] font-semibold rounded-[10px] transition-colors hover:bg-foreground hover:text-background disabled:opacity-60 disabled:cursor-not-allowed">
      <span>{t('Pagar por transferencia')}, {p.transferRate}% off</span>
      <span className="tabular-nums">{formatPrice(p.transferPrice)}</span>
    </button>
  );
}

function usePromedioResenas(): { promedio: string; total: number } | null {
  const [r, setR] = useState<{ promedio: string; total: number } | null>(null);
  useEffect(() => {
    let cancelado = false;
    getPublicReviewSummary()
      .then(s => {
        if (cancelado || !s || !s.total || s.average == null) return;
        setR({ promedio: s.average.toFixed(1).replace('.', ','), total: s.total });
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);
  return r;
}

export function LineaResenas() {
  const { t } = useLocale();
  const r = usePromedioResenas();
  if (!r) return null;
  return (
    <p className="text-[12px] text-muted-foreground">
      <span className="font-semibold text-foreground">{r.promedio}</span> {t('de 5')} · {r.total} {t('reseñas de la tienda')}
    </p>
  );
}

const pesosSinCentavos = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`;

/** Tres promesas en texto plano, sin íconos. */
export function Promesas({ p }: { p: FichaProps }) {
  const { t, currency } = useLocale();
  const r = usePromedioResenas();
  return (
    <div className="flex flex-col gap-0.5 text-[13px]">
      {currency === 'ARS' && (
        <span>
          {p.displayPrice >= FREE_SHIPPING_THRESHOLD
            ? t('Envío gratis a sucursal en este pedido.')
            : `${t('Envío gratis a sucursal desde')} ${pesosSinCentavos(FREE_SHIPPING_THRESHOLD)}.`}
        </span>
      )}
      <span>{t('30 días para cambios.')}</span>
      {r && <span>{r.promedio} {t('de 5 en reseñas de clientes.')}</span>}
    </div>
  );
}

/** Las mismas promesas en caja, con una línea de explicación cada una. */
export function PromesasCaja({ p, calidad }: { p: FichaProps; calidad?: string | null }) {
  const { t, currency } = useLocale();
  const items: { titulo: string; texto: string }[] = [
    { titulo: t('30 días para cambios'), texto: t('Despachamos el talle nuevo y entregás el anterior al recibirlo.') },
  ];
  if (currency === 'ARS') items.push({
    titulo: t('Envío gratis a sucursal'),
    texto: p.displayPrice >= FREE_SHIPPING_THRESHOLD ? t('Este pedido ya lo tiene.') : `${t('En compras desde')} ${pesosSinCentavos(FREE_SHIPPING_THRESHOLD)}.`,
  });
  if (calidad) items.push({ titulo: t('Hecho para durar'), texto: calidad });
  return (
    <div className="flex flex-col sm:flex-row border border-border rounded-[10px] divide-y sm:divide-y-0 sm:divide-x divide-border">
      {items.map(i => (
        <div key={i.titulo} className="px-3.5 py-3 min-w-0 sm:flex-1">
          <p className="text-[13px] font-semibold">{i.titulo}</p>
          <p className="text-[12px] text-muted-foreground">{i.texto}</p>
        </div>
      ))}
    </div>
  );
}

const CLAVE_CP = 'hype_cp';

/**
 * Cuándo llega y cuánto sale, por código postal, antes de entrar al checkout.
 * Usa el mismo cotizador y la misma regla de envío gratis que el checkout.
 * Andreani devuelve el costo pero no el plazo: las fechas salen del plazo
 * general que ya promete el sitio.
 */
export function CuandoLlega({ p }: { p: FichaProps }) {
  const { t, currency } = useLocale();
  const [cp, setCp] = useState('');
  const [tarifas, setTarifas] = useState<TarifaEnvio[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cotizar = async (valor: string) => {
    const limpio = normalizeCpAr(valor);
    if (!/^\d{4}$/.test(limpio)) { setError(t('Escribí un código postal de 4 dígitos.')); setTarifas(null); return; }
    setCargando(true); setError(null);
    try {
      const res = await fetch(`/api/andreani-rates?cp=${limpio}&provincia=&valor=${Math.round(p.displayPrice)}&peso=0.5`);
      const data: { rates?: TarifaEnvio[] } = await res.json();
      if (!data.rates?.length) { setTarifas(null); setError(t('No encontramos opciones de envío para ese código postal.')); return; }
      setTarifas(ordenarTarifas(data.rates));
      try { localStorage.setItem(CLAVE_CP, limpio); } catch {}
    } catch {
      setTarifas(null); setError(t('No pudimos calcular el envío. Probá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  // Si ya cotizó en otra ficha, el resultado aparece solo.
  useEffect(() => {
    let guardado = '';
    try { guardado = localStorage.getItem(CLAVE_CP) ?? ''; } catch {}
    if (guardado) { setCp(guardado); cotizar(guardado); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.product.slug]);

  if (currency !== 'ARS') return null;
  const ctx = { subtotalFisico: p.displayPrice };
  const ventana = ventanaEntrega();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="ficha-cp" className="text-[11px] font-semibold uppercase tracking-[0.1em]">{t('Cuándo llega')}</label>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); cotizar(cp); }}>
        <input id="ficha-cp" inputMode="numeric" autoComplete="postal-code" value={cp}
          onChange={e => setCp(e.target.value)} placeholder={t('Tu código postal')}
          className="flex-1 min-w-0 h-[42px] px-3 border border-border rounded-[10px] text-[16px] md:text-[13px] bg-background focus:outline-none focus:border-foreground" />
        <button type="submit" disabled={cargando}
          className="h-[42px] px-4 border border-foreground rounded-[10px] text-[12px] font-semibold hover:bg-foreground hover:text-background transition-colors disabled:opacity-60">
          {cargando ? t('Calculando...') : t('Calcular')}
        </button>
      </form>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      {tarifas && (
        <div className="text-[13px]">
          {tarifas.map(tarifa => {
            const costo = costoEnvio(tarifa, tarifas, ctx);
            const sucursal = modoDeTarifa(tarifa) === 'sucursal';
            return (
              <div key={tarifa.id} className="flex justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
                <span>
                  {sucursal ? t('Sucursal Andreani') : t('A domicilio')}
                  {' · '}
                  {costo === 0
                    ? <span className="text-green-700 font-semibold">{t('gratis')}</span>
                    : <span className="tabular-nums">{pesosSinCentavos(costo)}</span>}
                </span>
                <span className="font-semibold text-right">{ventana}</span>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {t('Fechas estimadas')}: {ENTREGA_DIAS_HABILES.min} {t('a')} {ENTREGA_DIAS_HABILES.max} {t('días hábiles desde el despacho.')}
          </p>
        </div>
      )}
    </div>
  );
}

/** Desplegable que puede arrancar abierto. `plano` saca las líneas, como en la variante A. */
export function Desplegable({ titulo, abierto = false, plano = false, children }: { titulo: string; abierto?: boolean; plano?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(abierto);
  return (
    <div className={plano ? '' : 'border-t border-border'}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className={`w-full flex items-center ${plano ? 'gap-2.5 py-2.5' : 'justify-between py-4'} text-left`}>
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em]">{titulo}</span>
        <span className="text-[15px] leading-none text-foreground/60">{open ? '—' : '+'}</span>
      </button>
      {open && (
        <div className={`${plano ? 'pb-3' : 'pb-4'} text-[13px] text-foreground/65 leading-relaxed flex flex-col gap-3`}>{children}</div>
      )}
    </div>
  );
}

export function TextoEnvios({ p }: { p: FichaProps }) {
  const { t, currency } = useLocale();
  const gratis = currency === 'ARS' && p.displayPrice >= FREE_SHIPPING_THRESHOLD;
  return (
    <>
      <p>
        - {t('Sucursal Andreani')}: {gratis
          ? <span className="text-foreground font-medium">{t('gratis en este pedido')}</span>
          : <>{t('gratis desde')} {pesosSinCentavos(FREE_SHIPPING_THRESHOLD)}</>}
        <br />- {t('A domicilio: se calcula con tu código postal')}
        <br />- {t('Todo el país en')} {ENTREGA_DIAS_HABILES.min} {t('a')} {ENTREGA_DIAS_HABILES.max} {t('días hábiles')}
        <br />- {t('Exterior: FedEx puerta a puerta')}
      </p>
      <p>{t('Despachamos una vez confirmado el pago. Fines de semana y feriados no cuentan como días hábiles.')}</p>
    </>
  );
}

export function TextoCambios() {
  const { t } = useLocale();
  return (
    <>
      <p>{t('Tenés 30 días desde la compra para cambiar el talle. La prenda tiene que estar sin uso y con sus etiquetas.')}</p>
      <p>{t('Despachamos el talle nuevo y, cuando lo recibís, entregás el anterior en el mismo momento.')}</p>
      <a href="/politicas-de-devolucion/" className="underline underline-offset-[3px] text-foreground hover:text-foreground/70 transition-colors">{t('Ver políticas completas')}</a>
    </>
  );
}

/** Medidas por talle en texto. Si el producto no las tiene cargadas, devuelve null. */
export function TablaMedidas({ product }: { product: Product }) {
  const { t } = useLocale();
  const filas = product.measurementsTable
    ?? (product.measurements ? [{ size: product.sizeEquivalent || t('Único'), ...product.measurements }] : null);
  if (!filas?.length) return null;
  const columnas = ([['ancho', 'Ancho'], ['largo', 'Largo'], ['manga', 'Manga']] as const).filter(([k]) => filas.some(f => f[k]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left font-medium text-muted-foreground py-2 pr-4">{t('Talle')}</th>
            {columnas.map(([k, label]) => <th key={k} className="text-left font-medium text-muted-foreground py-2 pr-4">{t(label)}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.size} className="border-b border-border last:border-b-0">
              <td className="py-2 pr-4 font-semibold uppercase">{f.size}</td>
              {columnas.map(([k]) => <td key={k} className="py-2 pr-4 tabular-nums">{f[k] ? `${f[k]} cm` : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground mt-2">{t('Medido en plano · puede variar ±2 cm.')}</p>
    </div>
  );
}

/** Interruptor Él / Ella: cambia qué fotos abre la galería. */
export function InterruptorModelo({ p, sobreFoto = false }: { p: FichaProps; sobreFoto?: boolean }) {
  const { t } = useLocale();
  if (!p.modelo) return null;
  const ella = p.modelo === 'ella';
  return (
    <button role="switch" aria-checked={ella} aria-label={t('Ver las fotos de ella')}
      onClick={(e) => { e.stopPropagation(); p.onModelo(ella ? 'el' : 'ella'); }}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[13px] font-medium text-white ${sobreFoto ? 'bg-black/40 backdrop-blur-sm' : 'bg-foreground'}`}>
      <span className={ella ? 'opacity-60' : ''}>{t('Él')}</span>
      <span className="relative w-[30px] h-4 rounded-full bg-white">
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-[left] duration-150 motion-reduce:transition-none ${ella ? 'left-4' : 'left-0.5'}`} />
      </span>
      <span className={ella ? '' : 'opacity-60'}>{t('Ella')}</span>
    </button>
  );
}
