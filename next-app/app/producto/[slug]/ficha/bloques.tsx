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
import { ventanaEntrega, type Modelo } from '@/lib/ficha';

/**
 * Capa visual de Private Access (preventa Mejores Amigos). Solo agrega un
 * badge, la línea de la preventa y las migas a la colección; el resto de la
 * ficha es la de siempre.
 */
export interface FichaPrivateAccess {
  /** "Mejores Amigos" */
  badge: string;
  /** "Preventa exclusiva hasta el 10.10" */
  note: string;
  /** Título de la colección para las migas y los relacionados. */
  collectionName: string;
  /** /private-access */
  backHref: string;
}

/** Todo lo que la ficha necesita de ProductoClient, que sigue siendo dueño del estado. */
export interface FichaProps {
  privateAccess?: FichaPrivateAccess;
  product: Product;
  galleryImages: string[];
  selectedImage: number;
  onSelectImage: (i: number) => void;
  onOpenGallery: () => void;
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
  onSizeGuide: () => void;
  addBtnRef: RefObject<HTMLButtonElement>;
  primaryBtnClass: string;
  modelo: Modelo | null;
  onModelo: (m: Modelo) => void;
  related: ReactNode;
}

export function imgUrl(src: string): string {
  if (!src) return '';
  const s = src.replace('http://hypestyle.local', 'https://lightpink-rook-704850.hostingersite.com');
  return s.startsWith('http') || s.startsWith('/') ? s : `/${s}`;
}

export function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src || '');
}

export function Foto({ src, alt, sizes, priority, calidad, className = 'object-cover object-top' }: { src: string; alt: string; sizes: string; priority?: boolean; calidad?: number; className?: string }) {
  return isVideo(src)
    ? <video src={imgUrl(src)} autoPlay muted loop playsInline className={`absolute inset-0 w-full h-full ${className}`} />
    : <Image src={imgUrl(src)} alt={alt} fill sizes={sizes} priority={priority} quality={calidad} className={className} />;
}

export function Migas({ product, privateAccess }: { product: Product; privateAccess?: FichaPrivateAccess }) {
  const { t } = useLocale();
  if (privateAccess) {
    return (
      <p className="text-[12px] text-muted-foreground">
        <a href={privateAccess.backHref} className="hover:text-foreground transition-colors">{privateAccess.collectionName}</a>
        {' / '}
        <span className="text-foreground">{product.name}</span>
      </p>
    );
  }
  return (
    <p className="text-[12px] text-muted-foreground">
      <a href="/productos/" className="hover:text-foreground transition-colors">{t(product.category)}</a>
      {' / '}
      <span className="text-foreground">{product.name}</span>
    </p>
  );
}

export function Precio({ p }: { p: FichaProps }) {
  const { formatPrice } = useLocale();
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[20px] font-semibold tabular-nums">
        {p.mounted ? formatPrice(p.displayPrice) : '—'}
      </span>
      {p.displayOriginal && p.mounted && (
        <span className="text-[15px] text-muted-foreground line-through tabular-nums">{formatPrice(p.displayOriginal)}</span>
      )}
    </div>
  );
}

/** Badge chico arriba del nombre: punto verde + "MEJORES AMIGOS". */
export function BadgePrivateAccess({ pa }: { pa: FichaPrivateAccess }) {
  return (
    <span className="self-start inline-flex items-center gap-1.5 rounded-full bg-bg-dark text-white px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.2em]">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,55%)]" aria-hidden />
      {pa.badge}
    </span>
  );
}

/** "Preventa exclusiva hasta el 10.10", debajo del precio. */
export function NotaPreventa({ pa }: { pa: FichaPrivateAccess }) {
  return <p className="text-[12px] text-muted-foreground">{pa.note}</p>;
}

/** "−33%" junto al precio cuando hay precio tachado. */
export function Descuento({ p }: { p: FichaProps }) {
  if (!p.mounted || !p.displayOriginal || p.displayOriginal <= p.displayPrice) return null;
  const pct = Math.round((1 - p.displayPrice / p.displayOriginal) * 100);
  if (pct < 1) return null;
  return <span className="text-[12px] font-semibold text-sale tabular-nums">−{pct}%</span>;
}

/** Medios de pago como tabla. Transferencia primero: es el medio que mejor cobra. */
export function TablaPagos({ p }: { p: FichaProps }) {
  const { formatPrice, currency, t } = useLocale();
  if (!p.mounted || currency !== 'ARS') return null;
  return (
    <div className="text-[13px] border-t border-border">
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
            // En la preventa el otro color es otra ficha privada, no la pública.
            onClick={() => { if (c.slug && c.slug !== product.slug) router.push(p.privateAccess ? `/private-access/${c.slug}` : `/producto/${c.slug}/`); }}
            className={`relative w-[56px] h-[72px] overflow-hidden bg-bg-alt border-b-2 transition-colors ${c.slug === product.slug || p.selectedColor === c.label ? 'border-foreground' : 'border-transparent hover:border-foreground/40'}`}>
            {c.image && <Image src={imgUrl(c.image)} alt={c.label} fill sizes="56px" className="object-cover" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SelectorTalle({ p }: { p: FichaProps }) {
  const { t } = useLocale();
  const { product, selectedSize, liveOutSizes } = p;
  const esColor = !!product.colorVariant;
  const agotados = product.sizes.filter(s => product.stock[s] === 'out' || liveOutSizes.has(s));

  // Talle único (ej. accesorios): no hay variante para elegir ni guía que mostrar.
  if (product.sizes.length === 1 && !esColor) {
    return (
      <div className="flex flex-col gap-2.5">
        <p className="text-[12px] text-muted-foreground">
          {t('Talle')} <span className="text-foreground font-semibold">{t('Único')}{product.sizeEquivalent ? ` · ${t('equivale a un')} ${product.sizeEquivalent}` : ''}</span>
        </p>
        {agotados.length > 0 && <StockAlertForm key={product.slug} slug={product.slug} sizes={agotados} />}
      </div>
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
        <button onClick={p.onSizeGuide} className="text-[12px] underline underline-offset-[3px] text-muted-foreground hover:text-foreground transition-colors">
          {t('Guía de talles')}
        </button>
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

/**
 * Cuándo sale el pedido, pegado al botón de compra.
 * Dice lo mismo que ya promete "Envíos y devoluciones". Cuando haya un plazo
 * de despacho confirmado en horas, va acá.
 */
export function LineaDespacho() {
  const { t } = useLocale();
  return (
    <p className="flex items-baseline gap-2 text-[12px] text-muted-foreground">
      <span className="w-[7px] h-[7px] rounded-full bg-green-700 flex-shrink-0 -translate-y-px" />
      <span>{t('Preparamos y despachamos tu pedido una vez confirmado el pago.')}</span>
    </p>
  );
}

/** Agregar al carrito con el precio adentro del botón. */
export function BotonComprar({ p }: { p: FichaProps }) {
  const { formatPrice, t } = useLocale();
  return (
    <button ref={p.addBtnRef} onClick={p.onAdd} disabled={p.stockChecking}
      className={`w-full h-[54px] px-5 flex items-center justify-between gap-3 ${p.primaryBtnClass} text-primary-foreground text-[13px] font-bold uppercase tracking-[0.1em] rounded-[10px] transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed`}>
      <span>{p.stockChecking ? t('Verificando stock...') : t('Agregar al carrito')}</span>
      <span className="tabular-nums tracking-[0.02em]">{p.mounted ? formatPrice(p.displayPrice) : ''}</span>
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

/** Las reseñas son de la tienda, no del producto: el texto lo dice. */
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

/** Promesas en texto plano, sin íconos. */
export function Promesas({ p }: { p: FichaProps }) {
  const { t, currency } = useLocale();
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
    </div>
  );
}

const CLAVE_CP = 'hype_cp';

/**
 * Cuándo llega y cuánto sale, por código postal, antes de entrar al checkout.
 * Usa el mismo cotizador y la misma regla de envío gratis que el checkout.
 * Andreani devuelve el costo pero no el plazo: las fechas salen del plazo
 * general que ya promete el sitio, y se muestran como estimadas.
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
  }, [p.product.slug, p.displayPrice]);

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
            {t('Fechas estimadas, contando de 5 a 10 días hábiles.')}
          </p>
        </div>
      )}
    </div>
  );
}

/** Desplegable sin líneas que puede arrancar abierto. */
export function Desplegable({ titulo, abierto = false, children }: { titulo: string; abierto?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(abierto);
  return (
    <div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-2.5 py-2.5 text-left">
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em]">{titulo}</span>
        <span className="text-[15px] leading-none text-foreground/60">{open ? '—' : '+'}</span>
      </button>
      {open && (
        <div className="pb-3 text-[13px] text-foreground/65 leading-relaxed flex flex-col gap-3">{children}</div>
      )}
    </div>
  );
}

export function TextoEnvios({ p }: { p: FichaProps }) {
  const { t, currency } = useLocale();
  const gratis = currency === 'ARS' && p.displayPrice >= FREE_SHIPPING_THRESHOLD;
  return (
    <>
      <p className="font-semibold text-foreground">{t('Envíos en Argentina')}</p>
      <p>{t('A todo el país vía Andreani; el costo se calcula en el checkout. El tiempo de entrega estimado es de 5 a 10 días hábiles, y en algunos casos puede extenderse hasta 15 días hábiles según la zona y la demanda.')}</p>
      {currency === 'ARS' && (
        <p>
          {gratis
            ? <span className="text-foreground font-medium">{t('Envío gratis a sucursal en este pedido.')}</span>
            : <>{t('Envío gratis a sucursal desde')} {pesosSinCentavos(FREE_SHIPPING_THRESHOLD)}.</>}
        </p>
      )}
      <p>{t('Preparamos y despachamos tu pedido una vez confirmado el pago. Los fines de semana y feriados no se cuentan como días hábiles.')}</p>

      <p className="font-semibold text-foreground">{t('Preventa')}</p>
      <p>{t('Los productos en PREVENTA se despachan según la fecha estimada indicada en la página del producto y pueden demorar algo más de lo estipulado. Si tu compra incluye un producto en preventa, el pedido se envía completo cuando esté disponible.')}</p>

      <p className="font-semibold text-foreground">{t('Envíos internacionales')}</p>
      <p>{t('Enviamos a todo el mundo vía FedEx, puerta a puerta, con seguimiento y seguro. El costo se calcula en el checkout según lo que lleves y a qué país va, y se paga junto con el pedido. Los impuestos y aranceles aduaneros del país de destino quedan a cargo de quien recibe.')}</p>
    </>
  );
}

export function TextoCambios() {
  const { t } = useLocale();
  return (
    <>
      <p>{t('Aceptamos cambios hasta 30 días desde la compra. El producto debe estar sin uso, con etiquetas y en su empaque original.')}</p>
      <a href="/politicas-de-devolucion/" className="underline underline-offset-[3px] text-foreground hover:text-foreground/70 transition-colors">{t('Ver políticas completas →')}</a>
    </>
  );
}

/** Cierre de la guía de cuidado: encogimiento, variaciones de medidas y qué talle elegir ante la duda. Mismo texto que /politicas-de-devolucion. */
export function NotaCuidadoTalles() {
  const { t } = useLocale();
  return (
    <>
      <p>{t('Las remeras son de algodón y pueden achicarse con el calor: lavalas con agua fría, sin secadora y sin agua caliente, y dejalas secar al aire.')}</p>
      <p className="font-semibold text-foreground">{t('Variaciones de medidas')}</p>
      <p>{t('Las prendas pueden presentar variaciones de 1 a 2 cm respecto a la tabla de talles, propias del proceso de confección. Estas variaciones no son consideradas falla de fabricación.')}</p>
      <p className="text-foreground font-medium">{t('Si dudás entre dos talles, elegí el más grande: una remera un poco holgada se usa igual; una que queda chica, no.')}</p>
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
              <td className="py-2 pr-4 font-semibold uppercase text-foreground">{f.size}</td>
              {columnas.map(([k]) => <td key={k} className="py-2 pr-4 tabular-nums text-foreground">{f[k] ? `${f[k]} cm` : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground mt-2">{t('Medido en plano · puede variar ±2 cm.')}</p>
      <p className="text-[12px] text-foreground/70 mt-1">{t('Si dudás entre dos talles, elegí el más grande: una remera un poco holgada se usa igual; una que queda chica, no.')}</p>
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
