'use client';

import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { composicion, esMockup, resumen } from '@/lib/ficha';
import {
  type FichaProps, Foto, Migas, Precio, Descuento, TablaPagos, SelectorColor, SelectorTalle,
  LineaDespacho, LineaResenas, BotonComprar, Promesas, CuandoLlega, Desplegable,
  TextoEnvios, TextoCambios, TablaMedidas, InterruptorModelo, imgUrl, isVideo,
} from './bloques';

/**
 * Ficha de producto en tres columnas: información · foto · compra.
 *
 * Pensada para responder las dudas antes del checkout: materiales y medidas a
 * la izquierda; a la derecha nombre, precio, medios de pago, calce junto al
 * talle y cuándo llega por código postal. En desktop las tres columnas ocupan
 * una pantalla y cada una tiene su propio scroll si el contenido no entra.
 *
 * En mobile el orden es foto → nombre y compra → información.
 */
export default function Ficha(p: FichaProps) {
  const { t } = useLocale();
  const { product, galleryImages, selectedImage } = p;
  const tela = composicion(p.descripcion);
  // Sin un párrafo que sirva de resumen, "Detalles" muestra la descripción entera.
  const intro = resumen(p.descripcion);
  const tieneMedidas = !!(product.measurementsTable || product.measurements);
  const actual = galleryImages[selectedImage];
  // La destacada de Woo es un mockup cuadrado sobre fondo transparente: en la
  // columna vertical se muestra entero en vez de recortarlo.
  const entera = esMockup(product.slug, actual) || actual === product.images[0];

  const alto = 'lg:h-[calc(100vh-var(--offset))]';
  // `my-auto` en el contenido (y no `justify-center` en la columna): si el
  // contenido es más alto que la pantalla, centrar con justify deja la parte de
  // arriba fuera del scroll.
  const columna = `lg:sticky lg:top-[var(--offset)] ${alto} lg:overflow-y-auto lg:flex lg:flex-col px-4 lg:px-10 xl:px-14 lg:py-10`;

  return (
    <main className="pt-[var(--offset)]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,40vw)_minmax(0,1fr)] gap-y-6 lg:gap-y-0 pb-12 lg:pb-0">

        {/* Izquierda: información */}
        <div className={`order-3 lg:order-none ${columna}`}>
          <div className="lg:my-auto flex flex-col gap-4">
            <div className="hidden lg:block"><Migas product={product} /></div>
            <div>
              <Desplegable titulo={t('Detalles')} abierto>
                <p className="whitespace-pre-line">{intro || p.descripcion}</p>
                {tela && <p className="text-foreground font-medium">{t('Composición')}: {tela}.</p>}
              </Desplegable>
              {tieneMedidas && <Desplegable titulo={t('Medidas de la prenda')} abierto><TablaMedidas product={product} /></Desplegable>}
              <Desplegable titulo={t('Envíos')}><TextoEnvios p={p} /></Desplegable>
              <Desplegable titulo={t('Cambios y devoluciones')} abierto={!tieneMedidas}><TextoCambios /></Desplegable>
              <Desplegable titulo={t('Guía de cuidado de ropa')}>
                <ul className="flex flex-col gap-1">
                  {product.careItems.map((item, i) => <li key={item.icon + '-' + i}>{t(item.text)}</li>)}
                </ul>
                {product.careNote && <p className="text-[12px] text-foreground/55">{t(product.careNote)}</p>}
              </Desplegable>
              {intro && <Desplegable titulo={t('Descripción')}><p className="whitespace-pre-line">{p.descripcion}</p></Desplegable>}
            </div>
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
          <Foto key={actual} src={actual} alt={product.name} priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className={entera ? 'object-contain' : 'object-cover object-top'} />

          <div onClick={e => e.stopPropagation()}
            className="hidden lg:flex absolute left-4 bottom-4 flex-col gap-1.5 max-h-[62%] overflow-y-auto">
            {galleryImages.slice(0, 7).map((img, i) => (
              <button key={img} onClick={() => p.onSelectImage(i)} aria-current={i === selectedImage}
                aria-label={`${isVideo(img) ? t('Ver video') : `${t('Ver imagen')} ${i + 1}`} — ${product.name}`}
                className={`relative w-[46px] h-[60px] flex-shrink-0 overflow-hidden bg-bg-alt transition-opacity duration-150 ${i === selectedImage ? 'opacity-100 outline outline-1 outline-foreground -outline-offset-1' : 'opacity-60 hover:opacity-100'}`}>
                {isVideo(img)
                  ? <video src={imgUrl(img)} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  : <Image src={imgUrl(img)} alt="" fill sizes="96px" className="object-cover object-top" />}
              </button>
            ))}
          </div>

          {/* Flechas: aparecen al pasar el cursor. */}
          {(['prev', 'next'] as const).map(dir => {
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

          {galleryImages.length > 1 && (
            <span className="lg:hidden absolute bottom-3 right-3 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm tabular-nums">
              {selectedImage + 1} / {galleryImages.length}
            </span>
          )}
          <div className="hidden lg:block absolute right-4 bottom-4"><InterruptorModelo p={p} sobreFoto /></div>
        </div>

        {/* Derecha: nombre, precio y compra */}
        <div className={`order-2 lg:order-none ${columna}`}>
          <div className="lg:my-auto flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2 min-w-0">
                <h1 className="text-[20px] lg:text-[26px] font-semibold tracking-[-0.015em] leading-[1.1]">{product.name}</h1>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <Precio p={p} />
                  <Descuento p={p} />
                </div>
                <LineaResenas />
              </div>
              <div className="lg:hidden flex-shrink-0 pt-0.5"><InterruptorModelo p={p} /></div>
            </div>

            <TablaPagos p={p} />
            <SelectorColor p={p} />
            <div className="flex flex-col gap-3">
              <SelectorTalle p={p} />
              {p.modelInfo && <div className="bg-bg-alt rounded-[10px] px-4 py-3">{p.modelInfo}</div>}
            </div>
            <div className="flex flex-col gap-2.5">
              <LineaDespacho />
              <BotonComprar p={p} />
            </div>
            <CuandoLlega p={p} />
            <Promesas p={p} />
          </div>
        </div>
      </div>

      <section className="max-w-[1400px] mx-auto px-4 pt-14 pb-20">
        <h2 className="text-lg font-bold uppercase tracking-tight mb-6">{t('Completa el look')}</h2>
        {p.related}
      </section>
    </main>
  );
}
