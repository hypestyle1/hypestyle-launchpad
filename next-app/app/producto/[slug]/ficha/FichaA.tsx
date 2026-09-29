'use client';

import { type ReactNode } from 'react';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/envio';
import { DESPACHO_HORAS_HABILES, ENTREGA_DIAS_HABILES, composicion, resumen } from '@/lib/ficha';
import {
  type FichaProps, Foto, Migas, Precio, Descuento, LineaPagos, TablaPagos, SelectorColor, SelectorTalle,
  LineaDespacho, LineaResenas, BotonComprar, BotonTransferencia, Promesas, CuandoLlega, Desplegable,
  TextoEnvios, TextoCambios, TablaMedidas, InterruptorModelo, imgUrl, isVideo,
} from './bloques';

/**
 * Ficha en tres columnas: información · foto de modelo · compra.
 * En desktop todo entra en una pantalla; nombre y precio abren la columna de compra.
 *
 *  a1 — limpia. Detalles y envíos abiertos a la izquierda, compra centrada.
 *  a2 — completa. Suma medios de pago, calce junto al talle y cuándo llega.
 *  a3 — ficha técnica. La info es una tabla de datos; el nombre queda arriba y
 *       la compra anclada abajo, usando toda la altura de la columna.
 *
 * En mobile el orden es foto → nombre y compra → información.
 */
export default function FichaA(p: FichaProps) {
  const { t } = useLocale();
  const { product, galleryImages, selectedImage, estilo } = p;
  const tela = composicion(p.descripcion);
  const tieneMedidas = !!(product.measurementsTable || product.measurements);

  const alto = 'lg:h-[calc(100vh-var(--offset))]';
  // `my-auto` en el contenido (y no `justify-center` en la columna): si el
  // contenido es más alto que la pantalla, centrar con justify deja la parte de
  // arriba fuera del scroll.
  const columna = `lg:sticky lg:top-[var(--offset)] ${alto} lg:overflow-y-auto lg:flex lg:flex-col px-4 lg:px-10 xl:px-14 lg:py-10`;
  const grilla = estilo === 'a3'
    ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,44vw)_minmax(0,1fr)]'
    : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,40vw)_minmax(0,1fr)]';

  const titulo = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-2 min-w-0">
        <h1 className={`${estilo === 'a3' ? 'text-[22px] lg:text-[32px]' : 'text-[20px] lg:text-[26px]'} font-semibold tracking-[-0.015em] leading-[1.1]`}>{product.name}</h1>
        <div className="flex items-baseline gap-3 flex-wrap">
          <Precio p={p} grande={estilo === 'a3'} />
          <Descuento p={p} />
        </div>
        {estilo !== 'a2' && <LineaPagos p={p} soloCuotas />}
        {estilo === 'a2' && <LineaResenas />}
      </div>
      <div className="lg:hidden flex-shrink-0 pt-0.5"><InterruptorModelo p={p} /></div>
    </div>
  );

  const compra = (
    <div className="flex flex-col gap-2.5">
      <LineaDespacho />
      <BotonComprar p={p} />
      {estilo !== 'a2' && <BotonTransferencia p={p} />}
    </div>
  );

  return (
    <main className="pt-[var(--offset)]">
      <div className={`grid grid-cols-1 ${grilla} gap-y-6 lg:gap-y-0 pb-12 lg:pb-0`}>

        {/* Izquierda: información */}
        <div className={`order-3 lg:order-none ${columna}`}>
          <div className="lg:my-auto flex flex-col gap-4">
            <div className="hidden lg:block"><Migas product={product} /></div>

            {estilo === 'a1' && (
              <div>
                <Desplegable titulo={t('Detalles')} abierto plano>
                  <p>{resumen(p.descripcion)}</p>
                  {tela && <p className="text-foreground font-medium">{tela}.</p>}
                  {p.modelInfo}
                </Desplegable>
                <Desplegable titulo={t('Envíos')} abierto plano><TextoEnvios p={p} /></Desplegable>
                <Desplegable titulo={t('Cambios')} plano><TextoCambios /></Desplegable>
                {tieneMedidas && <Desplegable titulo={t('Medidas de la prenda')} plano><TablaMedidas product={product} /></Desplegable>}
                <Desplegable titulo={t('Descripción completa')} plano><p className="whitespace-pre-line">{p.descripcion}</p></Desplegable>
              </div>
            )}

            {estilo === 'a2' && (
              <div>
                <Desplegable titulo={t('Detalles')} abierto plano>
                  <p>{resumen(p.descripcion)}</p>
                  {tela && <p className="text-foreground font-medium">{tela}.</p>}
                </Desplegable>
                {tieneMedidas && <Desplegable titulo={t('Medidas de la prenda')} abierto plano><TablaMedidas product={product} /></Desplegable>}
                <Desplegable titulo={t('Envíos')} plano><TextoEnvios p={p} /></Desplegable>
                <Desplegable titulo={t('Cambios')} abierto={!tieneMedidas} plano><TextoCambios /></Desplegable>
                <Desplegable titulo={t('Cuidado')} plano>
                  <ul className="flex flex-col gap-1">
                    {product.careItems.map((item, i) => <li key={item.icon + '-' + i}>{t(item.text)}</li>)}
                  </ul>
                </Desplegable>
                <Desplegable titulo={t('Descripción completa')} plano><p className="whitespace-pre-line">{p.descripcion}</p></Desplegable>
              </div>
            )}

            {estilo === 'a3' && (
              <>
                <p className="text-[13px] text-foreground/65 leading-relaxed">{resumen(p.descripcion)}</p>
                <dl className="border-t border-border">
                  {tela && <Dato nombre={t('Tela')}>{tela}</Dato>}
                  {product.category !== 'Accesorio' && <Dato nombre="Fit">{t(product.fit)}</Dato>}
                  {p.modelInfo && <Dato nombre={t('Calce')}>{p.modelInfo}</Dato>}
                  <Dato nombre={t('Despacho')}>{t('Hasta')} {DESPACHO_HORAS_HABILES} {t('h hábiles')}</Dato>
                  <Dato nombre={t('Entrega')}>{ENTREGA_DIAS_HABILES.min} {t('a')} {ENTREGA_DIAS_HABILES.max} {t('días hábiles, por Andreani')}</Dato>
                  <Dato nombre={t('Sucursal')}>
                    {p.displayPrice >= FREE_SHIPPING_THRESHOLD ? t('Gratis en este pedido') : `${t('Gratis desde')} $ ${FREE_SHIPPING_THRESHOLD.toLocaleString('es-AR')}`}
                  </Dato>
                  <Dato nombre={t('Cambios')}>{t('30 días, en un solo movimiento')}</Dato>
                  <Dato nombre={t('Cuidado')}>{product.careItems[0] ? t(product.careItems[0].text) : '—'}</Dato>
                </dl>
                <div>
                  {tieneMedidas && <Desplegable titulo={t('Medidas de la prenda')} plano><TablaMedidas product={product} /></Desplegable>}
                  <Desplegable titulo={t('Descripción completa')} plano><p className="whitespace-pre-line">{p.descripcion}</p></Desplegable>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Centro: la foto */}
        <div className={`group order-1 lg:order-none lg:sticky lg:top-[var(--offset)] ${alto} relative aspect-[4/5] lg:aspect-auto bg-bg-alt overflow-hidden cursor-zoom-in`}
          onClick={p.onOpenGallery}
          onTouchStart={e => { (e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX); }}
          onTouchEnd={e => {
            const x0 = Number((e.currentTarget as HTMLElement).dataset.x);
            const delta = x0 - e.changedTouches[0].clientX;
            if (Math.abs(delta) < 40) return;
            p.onSelectImage(Math.max(0, Math.min(galleryImages.length - 1, selectedImage + (delta > 0 ? 1 : -1))));
          }}>
          <Foto key={galleryImages[selectedImage]} src={galleryImages[selectedImage]} alt={product.name}
            sizes="(max-width: 1024px) 100vw, 44vw" priority />

          {/* Miniaturas: en columna abajo a la izquierda; en a3, en fila al pie. */}
          <div onClick={e => e.stopPropagation()}
            className={`hidden lg:flex absolute gap-1.5 ${estilo === 'a3'
              ? 'left-1/2 -translate-x-1/2 bottom-4 flex-row max-w-[80%] overflow-x-auto'
              : 'left-4 bottom-4 flex-col max-h-[62%] overflow-y-auto'}`}>
            {galleryImages.slice(0, 7).map((img, i) => (
              <button key={img} onClick={() => p.onSelectImage(i)} aria-current={i === selectedImage}
                aria-label={`${t('Ver imagen')} ${i + 1} — ${product.name}`}
                className={`relative w-[46px] h-[60px] flex-shrink-0 overflow-hidden bg-bg-alt transition-opacity duration-150 ${i === selectedImage ? 'opacity-100 outline outline-1 outline-foreground -outline-offset-1' : 'opacity-60 hover:opacity-100'}`}>
                {isVideo(img)
                  ? <video src={imgUrl(img)} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  : <Image src={imgUrl(img)} alt="" fill sizes="96px" className="object-cover object-top" />}
              </button>
            ))}
          </div>

          {/* Flechas: aparecen al pasar el cursor. */}
          {galleryImages.length > 1 && (['prev', 'next'] as const).map(dir => {
            const destino = selectedImage + (dir === 'next' ? 1 : -1);
            if (destino < 0 || destino > galleryImages.length - 1) return null;
            return (
              <button key={dir} onClick={e => { e.stopPropagation(); p.onSelectImage(destino); }}
                aria-label={t(dir === 'next' ? 'Siguiente' : 'Anterior')}
                className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 ${dir === 'next' ? 'right-3' : 'left-3'} w-9 h-9 items-center justify-center bg-white/85 text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d={dir === 'next' ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'} />
                </svg>
              </button>
            );
          })}

          <span className="absolute top-3 right-3 lg:top-auto lg:bottom-4 lg:right-auto lg:left-auto bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm tabular-nums lg:hidden">
            {selectedImage + 1} / {galleryImages.length}
          </span>
          <div className={`hidden lg:block absolute right-4 ${estilo === 'a3' ? 'top-4' : 'bottom-4'}`}><InterruptorModelo p={p} sobreFoto /></div>
        </div>

        {/* Derecha: nombre, precio y compra */}
        <div className={`order-2 lg:order-none ${columna}`}>
          {estilo === 'a3' ? (
            <div className="lg:flex-1 flex flex-col gap-6 lg:justify-between">
              {titulo}
              <div className="flex flex-col gap-6">
                <SelectorColor p={p} />
                <SelectorTalle p={p} />
                {compra}
                <Promesas p={p} />
              </div>
            </div>
          ) : (
            <div className="lg:my-auto flex flex-col gap-6">
              {titulo}
              {estilo === 'a2' && <TablaPagos p={p} />}
              <SelectorColor p={p} />
              <div className="flex flex-col gap-3">
                <SelectorTalle p={p} />
                {estilo === 'a2' && p.modelInfo && <div className="bg-bg-alt rounded-[10px] px-4 py-3">{p.modelInfo}</div>}
              </div>
              {compra}
              {estilo === 'a2' ? <CuandoLlega p={p} /> : <Promesas p={p} />}
              {estilo === 'a2' && <Promesas p={p} />}
            </div>
          )}
        </div>
      </div>

      <section className="max-w-[1400px] mx-auto px-4 pt-14 pb-20">
        <h2 className="text-lg font-semibold tracking-tight mb-6">{t('Completa el look')}</h2>
        {p.related}
      </section>
    </main>
  );
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-2.5 border-b border-border text-[13px]">
      <dt className="text-muted-foreground">{nombre}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}
