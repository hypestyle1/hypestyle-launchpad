'use client';

import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/envio';
import { DESPACHO_HORAS_HABILES, ENTREGA_DIAS_HABILES, composicion, resumen, vinetas } from '@/lib/ficha';
import {
  type FichaProps, Foto, Migas, Precio, LineaPagos, SelectorColor, SelectorTalle, LineaDespacho,
  BotonComprar, Promesas, TablaMedidas, InterruptorModelo, CuandoLlega, imgUrl, isVideo,
} from './bloques';

function Fila({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b border-border last:border-b-0 text-[13px]">
      <span>{a}</span><span className="font-semibold text-right">{b}</span>
    </div>
  );
}

/**
 * Variante C — ficha larga.
 * Arriba, galería en grilla y compra compacta que acompaña el scroll. Abajo la
 * ficha sigue en secciones: el detalle, talles y calce, envío y pago.
 *
 * Las secciones se arman con lo que el producto ya tiene cargado. "El detalle"
 * usa las viñetas de la descripción y las últimas fotos de la galería; si el
 * producto no tiene medidas por talle, la sección muestra la imagen de la guía.
 */
export default function FichaC(p: FichaProps) {
  const { t, currency } = useLocale();
  const { product, galleryImages } = p;
  const tela = composicion(p.descripcion);
  const puntos = vinetas(p.descripcion).slice(0, 6);
  // Las dos primeras ya abren la galería: el detalle sigue con las tres siguientes.
  const fotos = galleryImages.filter(g => !isVideo(g));
  const fotosDetalle = fotos.length >= 5 ? fotos.slice(2, 5) : fotos.slice(-3);
  // En la grilla de desktop entran seis; el resto se ve al ampliar.
  const enGrilla = 6;
  const tieneMedidas = !!(product.measurementsTable || product.measurements);
  const ars = currency === 'ARS';

  const abrir = (i: number) => { p.onSelectImage(i); p.onOpenGallery(); };

  return (
    <main className="pt-[var(--offset)]">
      <div className="max-w-[1500px] mx-auto lg:px-4 lg:pt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 lg:gap-12">

        {/* Galería: grilla en desktop, tira deslizable en mobile */}
        <div className="flex lg:grid lg:grid-cols-2 gap-1.5 overflow-x-auto lg:overflow-visible snap-x snap-mandatory px-4 lg:px-0">
          {galleryImages.map((img, i) => (
            <button key={img} onClick={() => abrir(i)}
              aria-label={`${t('Ver imagen')} ${i + 1} — ${product.name}`}
              className={`relative flex-none w-[78vw] sm:w-[46vw] lg:w-auto aspect-[4/5] lg:aspect-square bg-bg-alt overflow-hidden snap-start cursor-zoom-in ${i >= enGrilla ? 'lg:hidden' : ''}`}>
              <Foto src={img} alt={i === 0 ? product.name : ''} sizes="(max-width: 1024px) 78vw, 36vw" priority={i < 2} />
            </button>
          ))}
        </div>

        {/* Compra */}
        <div className="px-4 lg:px-0 lg:sticky lg:top-[calc(var(--offset)+16px)] lg:self-start flex flex-col gap-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 min-w-0">
              <Migas product={product} />
              <h1 className="text-[20px] lg:text-[26px] font-semibold tracking-[-0.01em] leading-[1.15]">{product.name}</h1>
              <Precio p={p} />
              <LineaPagos p={p} />
            </div>
            <div className="flex-shrink-0 pt-0.5"><InterruptorModelo p={p} /></div>
          </div>
          <SelectorColor p={p} />
          <SelectorTalle p={p} />
          <div className="flex flex-col gap-2.5">
            <LineaDespacho />
            <BotonComprar p={p} />
          </div>
          <Promesas p={p} />
          <nav className="flex flex-col gap-1 text-[12px]">
            <a href="#ficha-detalle" className="underline underline-offset-[3px] text-muted-foreground hover:text-foreground">{t('El detalle')}</a>
            <a href="#ficha-talles" className="underline underline-offset-[3px] text-muted-foreground hover:text-foreground">{t('Talles y calce')}</a>
            <a href="#ficha-envio" className="underline underline-offset-[3px] text-muted-foreground hover:text-foreground">{t('Envío y pago')}</a>
          </nav>
        </div>
      </div>

      {/* El detalle */}
      <section id="ficha-detalle" className="scroll-mt-[var(--offset)] max-w-[1500px] mx-auto px-4 py-12 lg:py-16 flex flex-col gap-6">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{t('El detalle')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-8 lg:gap-12">
          <div className="flex flex-col gap-4 text-[13px] text-foreground/65 leading-relaxed max-w-[60ch]">
            <p>{resumen(p.descripcion)}</p>
            {tela && <p className="text-foreground font-medium">{tela}.</p>}
            {puntos.length > 0 && (
              <ul className="flex flex-col">
                {puntos.map(v => <li key={v} className="py-2 border-b border-border last:border-b-0 text-foreground">{v}</li>)}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {fotosDetalle.map(img => (
              <button key={img} onClick={() => abrir(galleryImages.indexOf(img))}
                className="relative aspect-square bg-bg-alt overflow-hidden cursor-zoom-in" aria-label={t('Ampliar foto')}>
                <Image src={imgUrl(img)} alt="" fill sizes="(max-width: 1024px) 33vw, 22vw" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Talles y calce */}
      <section id="ficha-talles" className="scroll-mt-[var(--offset)] bg-bg-alt">
        <div className="max-w-[1500px] mx-auto px-4 py-12 lg:py-16 flex flex-col gap-6">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{t('Talles y calce')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
            {tieneMedidas
              ? <TablaMedidas product={product} />
              : p.sizeGuideImage
                ? <Image src={p.sizeGuideImage} alt={t('Guía de talles')} width={720} height={720} className="w-full max-w-[560px] h-auto mix-blend-multiply" />
                : null}
            <div className="flex flex-col gap-3 text-[13px]">
              {product.category !== 'Accesorio' && <Fila a="Fit" b={t(product.fit)} />}
              {p.modelInfo}
            </div>
          </div>
        </div>
      </section>

      {/* Envío y pago */}
      <section id="ficha-envio" className="scroll-mt-[var(--offset)] max-w-[1500px] mx-auto px-4 py-12 lg:py-16 flex flex-col gap-8">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{t('Envío y pago')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6">
          {[
            [t('Hoy'), t('Hacés el pedido y pagás.')],
            [`${t('Hasta')} ${DESPACHO_HORAS_HABILES} ${t('h hábiles')}`, t('Lo preparamos y lo despachamos.')],
            [`${ENTREGA_DIAS_HABILES.min} ${t('a')} ${ENTREGA_DIAS_HABILES.max} ${t('días hábiles')}`, t('Andreani lo lleva a tu sucursal o a tu casa, con seguimiento.')],
            [t('30 días'), t('Para cambiar el talle.')],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="border-t-2 border-foreground pt-3 pr-4">
              <p className="text-[13px] font-semibold">{titulo}</p>
              <p className="text-[12px] text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
          <div>
            <Fila a={t('Sucursal Andreani')} b={ars ? `${t('Gratis desde')} $ ${FREE_SHIPPING_THRESHOLD.toLocaleString('es-AR')}` : t('Se cotiza en el checkout')} />
            <Fila a={t('A domicilio')} b={t('Según código postal')} />
            <Fila a={t('Exterior, FedEx')} b={t('Se cotiza en el checkout')} />
          </div>
          <div>
            {ars && <Fila a={t('Transferencia')} b={`${p.transferRate}% off`} />}
            {ars && <Fila a={t('Tarjeta de crédito')} b={t('3 cuotas sin interés')} />}
            <Fila a={t('Desde el exterior')} b="PayPal" />
          </div>
          <CuandoLlega p={p} />
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 pb-20">
        <h2 className="text-lg font-semibold tracking-tight mb-6">{t('Completa el look')}</h2>
        {p.related}
      </section>
    </main>
  );
}
