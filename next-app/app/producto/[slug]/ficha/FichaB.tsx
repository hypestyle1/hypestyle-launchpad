'use client';

import { useLocale } from '@/context/LocaleContext';
import { composicion, resumen } from '@/lib/ficha';
import {
  type FichaProps, Precio, TablaPagos, SelectorColor, SelectorTalle, BotonComprar, CuandoLlega,
  PromesasCaja, Desplegable, TextoEnvios, TextoCambios, TablaMedidas, LineaResenas,
} from './bloques';

/**
 * Variante B — la ficha actual, reforzada.
 * Misma grilla y misma galería de hoy. En la columna de compra se suman los
 * bloques que faltaban: medios de pago, calce junto al talle, cuándo llega por
 * código postal y garantías. El primer desplegable arranca abierto.
 */
export default function FichaB(p: FichaProps) {
  const { t } = useLocale();
  const { product } = p;
  const tela = composicion(p.descripcion);

  return (
    <main className="pt-[var(--offset)]">
      <div className="max-w-[1400px] mx-auto px-4 py-3">
        <p className="text-[11px] text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">{t('Inicio')}</a>
          {' / '}
          <a href="/productos/" className="hover:text-foreground transition-colors">Shop</a>
          {' / '}
          <span className="text-foreground">{product.name}</span>
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {p.galeriaClasica}

          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] tracking-[0.02em] text-muted-foreground">{t(product.category)}</p>
              <h1 className="text-[22px] md:text-[26px] font-semibold tracking-[-0.01em] leading-[1.15]">{product.name}</h1>
              <LineaResenas />
            </div>

            <div>
              <Precio p={p} grande />
              <TablaPagos p={p} />
            </div>

            <SelectorColor p={p} />

            <div className="flex flex-col gap-3">
              <SelectorTalle p={p} />
              {p.modelInfo && (
                <div className="bg-bg-alt rounded-[10px] px-4 py-3.5">{p.modelInfo}</div>
              )}
            </div>

            <BotonComprar p={p} conPrecio={false} />

            <CuandoLlega p={p} />

            <PromesasCaja p={p} calidad={tela} />

            <div className="border-b border-border">
              <Desplegable titulo={t('Detalles y materiales')} abierto>
                <p>{resumen(p.descripcion)}</p>
                {tela && <p className="text-foreground font-medium">{tela}.</p>}
              </Desplegable>
              {(product.measurementsTable || product.measurements) && (
                <Desplegable titulo={t('Medidas de la prenda')}><TablaMedidas product={product} /></Desplegable>
              )}
              <Desplegable titulo={t('Descripción completa')}>
                <p className="whitespace-pre-line">{p.descripcion}</p>
              </Desplegable>
              <Desplegable titulo={t('Guía de cuidado de ropa')}>
                <ul className="flex flex-col gap-1.5">
                  {product.careItems.map((item, i) => <li key={item.icon + '-' + i}>{t(item.text)}</li>)}
                </ul>
                {product.careNote && <p className="text-[12px] text-foreground/55">{t(product.careNote)}</p>}
              </Desplegable>
              <Desplegable titulo={t('Envíos')}><TextoEnvios p={p} /></Desplegable>
              <Desplegable titulo={t('Cambios y devoluciones')}><TextoCambios /></Desplegable>
            </div>
          </div>
        </div>
      </div>

      <section className="max-w-[1400px] mx-auto px-4 pb-20">
        <h2 className="text-lg font-semibold tracking-tight mb-6">{t('Completa el look')}</h2>
        {p.related}
      </section>
    </main>
  );
}
