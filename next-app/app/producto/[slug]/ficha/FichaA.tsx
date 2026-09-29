'use client';

import { useLocale } from '@/context/LocaleContext';
import { composicion, resumen } from '@/lib/ficha';
import {
  type FichaProps, Foto, Migas, Precio, LineaPagos, SelectorColor, SelectorTalle, LineaDespacho,
  BotonComprar, BotonTransferencia, Promesas, Desplegable, TextoEnvios, TextoCambios, TablaMedidas,
  InterruptorModelo, imgUrl, isVideo,
} from './bloques';
import Image from 'next/image';

/**
 * Variante A — tres columnas.
 * Información a la izquierda, foto de modelo a toda la altura en el centro,
 * compra a la derecha. En desktop todo entra en una pantalla.
 *
 * En mobile las columnas laterales se deshacen (`contents`) y el orden pasa a
 * ser foto → título → compra → detalles.
 */
export default function FichaA(p: FichaProps) {
  const { t } = useLocale();
  const { product, galleryImages, selectedImage } = p;
  const tela = composicion(p.descripcion);
  const alto = 'lg:h-[calc(100vh-var(--offset))]';
  const columna = `lg:sticky lg:top-[var(--offset)] ${alto} lg:overflow-y-auto lg:flex lg:flex-col lg:justify-center lg:px-10 xl:px-14 lg:py-8`;

  return (
    <main className="pt-[var(--offset)]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,40vw)_minmax(0,1fr)] gap-y-5 lg:gap-y-0 pb-12 lg:pb-0">

        {/* Izquierda: título y detalles */}
        <div className={`contents ${columna} lg:gap-6`}>
          <div className="order-2 lg:order-none px-4 lg:px-0 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="hidden lg:block"><Migas product={product} /></div>
              <h1 className="text-[18px] lg:text-[26px] font-semibold tracking-[-0.01em] leading-[1.15]">{product.name}</h1>
              <Precio p={p} />
              <LineaPagos p={p} />
            </div>
            <div className="lg:hidden flex-shrink-0 pt-0.5"><InterruptorModelo p={p} /></div>
          </div>

          <div className="order-4 lg:order-none px-4 lg:px-0">
            <Desplegable titulo={t('Detalles')} abierto plano>
              <p>{resumen(p.descripcion)}</p>
              {tela && <p className="text-foreground font-medium">{tela}.</p>}
              {p.modelInfo}
            </Desplegable>
            <Desplegable titulo={t('Envíos')} abierto plano><TextoEnvios p={p} /></Desplegable>
            <Desplegable titulo={t('Cambios')} plano><TextoCambios /></Desplegable>
            {(product.measurementsTable || product.measurements) && (
              <Desplegable titulo={t('Medidas de la prenda')} plano><TablaMedidas product={product} /></Desplegable>
            )}
            <Desplegable titulo={t('Descripción completa')} plano>
              <p className="whitespace-pre-line">{p.descripcion}</p>
            </Desplegable>
          </div>
        </div>

        {/* Centro: la foto */}
        <div className={`order-1 lg:order-none lg:sticky lg:top-[var(--offset)] ${alto} relative aspect-[4/5] lg:aspect-auto bg-bg-alt overflow-hidden`}
          onClick={p.onOpenGallery}
          onTouchStart={e => { (e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX); }}
          onTouchEnd={e => {
            const x0 = Number((e.currentTarget as HTMLElement).dataset.x);
            const delta = x0 - e.changedTouches[0].clientX;
            if (Math.abs(delta) < 40) return;
            p.onSelectImage(Math.max(0, Math.min(galleryImages.length - 1, selectedImage + (delta > 0 ? 1 : -1))));
          }}>
          <Foto key={galleryImages[selectedImage]} src={galleryImages[selectedImage]} alt={product.name}
            sizes="(max-width: 1024px) 100vw, 40vw" priority />
          <div className="hidden lg:flex absolute left-4 bottom-4 flex-col gap-2 max-h-[60%] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {galleryImages.slice(0, 6).map((img, i) => (
              <button key={img} onClick={() => p.onSelectImage(i)} aria-current={i === selectedImage}
                aria-label={`${t('Ver imagen')} ${i + 1} — ${product.name}`}
                className={`relative w-[54px] h-[72px] flex-shrink-0 overflow-hidden bg-bg-alt border ${i === selectedImage ? 'border-foreground' : 'border-transparent'}`}>
                {isVideo(img)
                  ? <video src={imgUrl(img)} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  : <Image src={imgUrl(img)} alt="" fill sizes="54px" className="object-cover object-top" />}
              </button>
            ))}
          </div>
          <span className="lg:hidden absolute bottom-3 left-3 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 backdrop-blur-sm">
            {selectedImage + 1} / {galleryImages.length}
          </span>
          <div className="hidden lg:block absolute right-4 bottom-4"><InterruptorModelo p={p} sobreFoto /></div>
        </div>

        {/* Derecha: compra */}
        <div className={`order-3 lg:order-none px-4 flex flex-col gap-6 ${columna}`}>
          <SelectorColor p={p} />
          <SelectorTalle p={p} />
          <div className="flex flex-col gap-2.5">
            <LineaDespacho />
            <BotonComprar p={p} />
            <BotonTransferencia p={p} />
          </div>
          <Promesas p={p} />
        </div>
      </div>

      <section className="max-w-[1400px] mx-auto px-4 pt-14 pb-20">
        <h2 className="text-lg font-semibold tracking-tight mb-6">{t('Completa el look')}</h2>
        {p.related}
      </section>
    </main>
  );
}
