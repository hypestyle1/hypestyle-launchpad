'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale } from '@/context/LocaleContext';
import { type Product } from '@/data/products';
import { gaAsesorTalle } from '@/lib/ga';
import { type Molde } from '@/lib/talle/moldes';
import {
  CUERPO_INICIAL, LIMITES, cmAPiesPulgadas, kgALb, lbAKg, piesPulgadasACm,
  recomendar, type Cuerpo, type Genero, type Lectura, type Silueta,
} from '@/lib/talle/recomendador';

/**
 * Asesor de talle: tres pasos cortos (medidas · silueta · resultado) que
 * terminan en un talle con el porqué al lado.
 *
 * Por qué así y no "poné tu altura y listo":
 *  - El talle no sale solo de la altura: entre dos personas de 1,75 que pesan
 *    65 y 95 kg no hay un talle de diferencia, hay dos.
 *  - La silueta del segundo paso es lo que separa a dos cuerpos del mismo peso.
 *    Son tres toques, no un formulario.
 *  - El resultado muestra el motivo eje por eje. Una recomendación sin motivo
 *    no se puede discutir, y el cliente que no le cree igual tiene que elegir.
 *
 * Nada de esto sale del teléfono: la cuenta corre acá y lo único que se guarda
 * es en el localStorage del visitante, para no volver a preguntarle lo mismo
 * en el próximo producto.
 */

const CLAVE = 'hype_asesor_talle_v1';

const enPulgadas = (cm: number) => {
  const { pies, pulgadas } = cmAPiesPulgadas(cm);
  return pies * 12 + pulgadas;
};

interface Guardado {
  alturaCm: number;
  pesoKg: number;
  genero: Genero;
  pecho: Silueta;
  panza: Silueta;
  cadera: Silueta;
  metrico: boolean;
}

function leerGuardado(): Guardado | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const g = JSON.parse(raw) as Guardado;
    if (typeof g?.alturaCm !== 'number' || typeof g?.pesoKg !== 'number') return null;
    return g;
  } catch {
    return null;
  }
}

/* ─── Piezas chicas ────────────────────────────────────────────────────── */

function Segmentado<T extends string>({ valor, opciones, onChange, alto = 'h-11' }: {
  valor: T;
  opciones: { valor: T; label: string }[];
  onChange: (v: T) => void;
  alto?: string;
}) {
  return (
    <div className={`grid gap-0 ${alto} border border-border rounded-[10px] overflow-hidden`}
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map(o => (
        <button key={o.valor} type="button" onClick={() => onChange(o.valor)} aria-pressed={valor === o.valor}
          className={`text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors ${
            valor === o.valor ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Un número grande con su slider y los botones de −1 / +1, que son lo que de
 * verdad se usa en un teléfono: el slider sirve para moverse rápido, pero
 * afinar un centímetro arrastrando con el pulgar es imposible.
 *
 * Trabaja siempre en la unidad que se está mostrando (cm o pulgadas, kg o
 * libras) y el que lo usa se encarga de convertir: así un toque de "+" suma
 * una pulgada de verdad y no 1 cm disfrazado, que es lo que hace que el número
 * no se mueva en una de cada tres toques.
 */
function Dial({ etiqueta, valor, texto, unidad, min, max, onChange, unidades }: {
  etiqueta: string;
  /** En la unidad que se muestra. */
  valor: number;
  /** El número grande, ya formateado. */
  texto: string;
  unidad: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unidades: { label: string; activa: boolean; onClick: () => void }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{etiqueta}</span>
        <div className="flex gap-1">
          {unidades.map(u => (
            <button key={u.label} type="button" onClick={u.onClick}
              className={`px-2 h-6 text-[10px] font-bold uppercase tracking-[0.08em] rounded-[6px] transition-colors ${
                u.activa ? 'bg-foreground text-background' : 'bg-bg-alt text-muted-foreground hover:text-foreground'
              }`}>
              {u.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[30px] leading-none font-semibold tabular-nums tracking-[-0.02em]">
        {texto}{unidad && <span className="text-[14px] font-medium text-muted-foreground ml-1">{unidad}</span>}
      </p>
      <div className="flex items-center gap-3">
        <BotonPaso signo="−" onClick={() => onChange(Math.max(min, valor - 1))} etiqueta={`${etiqueta} −`} />
        <input type="range" min={min} max={max} value={valor} aria-label={etiqueta}
          onChange={e => onChange(Number(e.target.value))}
          className="asesor-slider flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer" />
        <BotonPaso signo="+" onClick={() => onChange(Math.min(max, valor + 1))} etiqueta={`${etiqueta} +`} />
      </div>
    </div>
  );
}

function BotonPaso({ signo, onClick, etiqueta }: { signo: string; onClick: () => void; etiqueta: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta}
      className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-border rounded-full text-[15px] leading-none text-foreground hover:border-foreground transition-colors active:scale-95 motion-reduce:active:scale-100">
      {signo}
    </button>
  );
}

/**
 * La silueta que acompaña las medidas. No es decoración: ver el muñeco
 * ensancharse al subir el peso es lo que le dice a la persona que el número
 * que está moviendo significa algo.
 */
function Silueta2D({ alturaCm, pesoKg }: { alturaCm: number; pesoKg: number }) {
  const h = (alturaCm - LIMITES.alturaCm.min) / (LIMITES.alturaCm.max - LIMITES.alturaCm.min); // 0..1
  const imc = pesoKg / (alturaCm / 100) ** 2;
  const w = Math.min(1, Math.max(0, (imc - 16) / 20)); // 0..1
  const alto = 86 + h * 34;
  const ancho = 15 + w * 20;
  const cabeza = 7.5;
  const cx = 32;
  const yCabeza = 120 - alto;
  const yHombro = yCabeza + cabeza * 2 + 2;
  const yCadera = yHombro + (alto - cabeza * 2 - 2) * 0.46;
  return (
    <svg width="64" height="124" viewBox="0 0 64 124" fill="none" aria-hidden
      className="flex-shrink-0 text-foreground transition-[opacity] duration-150">
      <circle cx={cx} cy={yCabeza + cabeza} r={cabeza} stroke="currentColor" strokeWidth="1.4" />
      {/* torso */}
      <path d={`M${cx - ancho / 2} ${yHombro} L${cx + ancho / 2} ${yHombro} L${cx + ancho / 2.3} ${yCadera} L${cx - ancho / 2.3} ${yCadera} Z`}
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* brazos */}
      <path d={`M${cx - ancho / 2} ${yHombro} L${cx - ancho / 2 - 4} ${yCadera + 6}`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M${cx + ancho / 2} ${yHombro} L${cx + ancho / 2 + 4} ${yCadera + 6}`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* piernas */}
      <path d={`M${cx - ancho / 2.3 + 1} ${yCadera} L${cx - ancho / 3.4} 120`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M${cx + ancho / 2.3 - 1} ${yCadera} L${cx + ancho / 3.4} 120`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const COLOR_ESTADO: Record<Lectura['estado'], string> = {
  justo: 'bg-green-700',
  holgado: 'bg-amber-500',
  ajustado: 'bg-amber-500',
};

/* ─── El asesor ────────────────────────────────────────────────────────── */

export interface AsesorTalleProps {
  product: Product;
  molde: Molde;
  precio: string;
  portada: string;
  /** Talles que hoy tienen stock; si falta el recomendado, se avisa. */
  tallesConStock: string[];
  onCerrar: () => void;
  /** Deja el talle elegido en la ficha y cierra. */
  onElegir: (talle: string) => void;
  /** Elige el talle y lo manda al carrito. */
  onAgregar: (talle: string) => void;
}

export default function AsesorTalle({
  product, molde, precio, portada, tallesConStock, onCerrar, onElegir, onAgregar,
}: AsesorTalleProps) {
  const { t } = useLocale();
  const [paso, setPaso] = useState(0);
  const [metrico, setMetrico] = useState(true);
  const [genero, setGenero] = useState<Genero>('hombre');
  const [alturaCm, setAlturaCm] = useState(CUERPO_INICIAL.hombre.alturaCm);
  const [pesoKg, setPesoKg] = useState(CUERPO_INICIAL.hombre.pesoKg);
  const [pecho, setPecho] = useState<Silueta>('promedio');
  const [panza, setPanza] = useState<Silueta>('promedio');
  const [cadera, setCadera] = useState<Silueta>('promedio');
  const cajaRef = useRef<HTMLDivElement>(null);

  // Si ya contestó antes (en este u otro producto), arrancamos de ahí.
  useEffect(() => {
    const g = leerGuardado();
    if (!g) return;
    setGenero(g.genero); setAlturaCm(g.alturaCm); setPesoKg(g.pesoKg);
    setPecho(g.pecho); setPanza(g.panza); setCadera(g.cadera); setMetrico(g.metrico);
  }, []);

  const cuerpo: Cuerpo = useMemo(
    () => ({ alturaCm, pesoKg, genero, pecho, panza, cadera }),
    [alturaCm, pesoKg, genero, pecho, panza, cadera],
  );

  const resultado = useMemo(
    () => recomendar(molde, cuerpo, tallesConStock),
    [molde, cuerpo, tallesConStock],
  );

  useEffect(() => {
    gaAsesorTalle('abierto', { item_id: product.id, molde: molde.id });
    // Solo al abrir: el resto de los renders no son una apertura nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se guarda recién en el resultado: hasta ahí la persona está probando.
  useEffect(() => {
    if (paso !== 2) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ alturaCm, pesoKg, genero, pecho, panza, cadera, metrico } satisfies Guardado));
    } catch { /* modo incógnito o storage lleno: no pasa nada */ }
  }, [paso, alturaCm, pesoKg, genero, pecho, panza, cadera, metrico]);

  // Una sola medición por llegada al resultado, no una por cada ajuste.
  const medido = useRef(false);
  useEffect(() => {
    if (paso !== 2 || medido.current || !resultado) return;
    medido.current = true;
    gaAsesorTalle('recomendacion', {
      item_id: product.id, molde: molde.id, talle: resultado.talle, confianza: resultado.confianza,
    });
  }, [paso, resultado, product.id, molde.id]);

  // Escape cierra y el fondo no scrollea mientras el asesor está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onCerrar]);

  useEffect(() => { cajaRef.current?.scrollTo({ top: 0 }); }, [paso]);

  const cambiarGenero = (g: Genero) => {
    // Solo movemos las medidas si la persona todavía no las tocó.
    setGenero(g);
    const anterior = CUERPO_INICIAL[genero];
    if (alturaCm === anterior.alturaCm && pesoKg === anterior.pesoKg) {
      setAlturaCm(CUERPO_INICIAL[g].alturaCm);
      setPesoKg(CUERPO_INICIAL[g].pesoKg);
    }
  };

  const pie = cmAPiesPulgadas(alturaCm);
  const pulgadas = pie.pies * 12 + pie.pulgadas;
  const titulos = [t('Medidas'), t('Silueta'), t('Tu talle')];
  /**
   * El talle que se muestra y se compra. Cuando el recomendado está agotado
   * mostramos el disponible más parecido y lo decimos: ofrecer un talle que no
   * se puede comprar es peor que no tener asesor.
   */
  const talleFinal = resultado ? (resultado.sinStock?.enSuLugar ?? resultado.talle) : '';

  return (
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center sm:p-4 bg-black/45"
      onClick={onCerrar} role="dialog" aria-modal="true" aria-label={t('Asesor de talle')}>
      <style>{`
        .asesor-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:9999px;background:hsl(var(--foreground));border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}
        .asesor-slider::-moz-range-thumb{width:22px;height:22px;border-radius:9999px;background:hsl(var(--foreground));border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}
      `}</style>

      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-[420px] max-h-[94vh] sm:max-h-[88vh] flex flex-col rounded-t-[16px] sm:rounded-[14px] shadow-2xl overflow-hidden">

        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]">{t('Asesor de talle')}</h2>
          <button onClick={onCerrar} aria-label={t('Cerrar')}
            className="w-8 h-8 -mr-2 flex items-center justify-center text-foreground/35 hover:text-foreground transition-colors">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        </div>

        {/* Producto */}
        <div className="mx-5 mb-3 flex items-center gap-3 bg-bg-alt rounded-[10px] p-2.5 flex-shrink-0">
          <div className="relative w-11 h-11 flex-shrink-0 bg-white rounded-[6px] overflow-hidden">
            {portada && <Image src={portada} alt="" fill sizes="44px" className="object-contain" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate">{product.name}</p>
            <p className="text-[12px] text-muted-foreground tabular-nums">{precio}</p>
          </div>
        </div>

        {/* Progreso */}
        <div className="px-5 flex-shrink-0">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ${i <= paso ? 'bg-foreground' : 'bg-border'}`} />
            ))}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {t('Paso')} {paso + 1}/3 · {titulos[paso]}
          </p>
        </div>

        {/* Cuerpo */}
        <div ref={cajaRef} className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
          {paso === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.015em] leading-tight">{t('Vamos a encontrar tu talle')}</h3>
                <p className="text-[12px] text-muted-foreground mt-1">{t('Dos medidas, diez segundos.')}</p>
              </div>

              <Segmentado<Genero> valor={genero} onChange={cambiarGenero}
                opciones={[{ valor: 'hombre', label: t('Hombre') }, { valor: 'mujer', label: t('Mujer') }]} />

              <div className="flex gap-4 items-stretch">
                <Silueta2D alturaCm={alturaCm} pesoKg={pesoKg} />
                <div className="flex-1 flex flex-col gap-5 min-w-0">
                  <Dial etiqueta={t('Altura')}
                    valor={metrico ? alturaCm : pulgadas}
                    texto={metrico ? String(alturaCm) : `${pie.pies}′${pie.pulgadas}″`}
                    unidad={metrico ? 'cm' : ''}
                    min={metrico ? LIMITES.alturaCm.min : enPulgadas(LIMITES.alturaCm.min)}
                    max={metrico ? LIMITES.alturaCm.max : enPulgadas(LIMITES.alturaCm.max)}
                    onChange={v => setAlturaCm(metrico ? v : piesPulgadasACm(0, v))}
                    unidades={[
                      { label: 'cm', activa: metrico, onClick: () => setMetrico(true) },
                      { label: 'ft', activa: !metrico, onClick: () => setMetrico(false) },
                    ]} />
                  <Dial etiqueta={t('Peso')}
                    valor={metrico ? pesoKg : kgALb(pesoKg)}
                    texto={String(metrico ? pesoKg : kgALb(pesoKg))}
                    unidad={metrico ? 'kg' : 'lb'}
                    min={metrico ? LIMITES.pesoKg.min : kgALb(LIMITES.pesoKg.min)}
                    max={metrico ? LIMITES.pesoKg.max : kgALb(LIMITES.pesoKg.max)}
                    onChange={v => setPesoKg(metrico ? v : lbAKg(v))}
                    unidades={[
                      { label: 'kg', activa: metrico, onClick: () => setMetrico(true) },
                      { label: 'lb', activa: !metrico, onClick: () => setMetrico(false) },
                    ]} />
                </div>
              </div>

              {resultado && (
                <div className="flex items-center justify-between border border-border rounded-[10px] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('Estimado en vivo')}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('Se afina en el próximo paso')}</p>
                  </div>
                  <span className="text-[22px] font-bold leading-none">{resultado.talle}</span>
                </div>
              )}
            </div>
          )}

          {paso === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.015em] leading-tight">{t('Tu silueta')}</h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  {t('Comparada con la mayoría de las personas de tu altura y peso.')}
                </p>
              </div>
              {([
                ['Pecho', pecho, setPecho],
                ['Cintura', panza, setPanza],
                ['Cadera', cadera, setCadera],
              ] as const).map(([label, valor, set]) => (
                <div key={label} className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t(label)}</span>
                  <Segmentado<Silueta> valor={valor} onChange={set as (v: Silueta) => void} alto="h-10"
                    opciones={[
                      // "Más angosto" / "Más ancho" y no "Angosto" / "Ancho":
                      // el diccionario de i18n indexa por texto exacto y
                      // "Ancho" ya es el encabezado de la tabla de medidas de
                      // la prenda, donde quiere decir otra cosa.
                      { valor: 'angosta', label: t('Más angosto') },
                      { valor: 'promedio', label: t('Promedio') },
                      { valor: 'ancha', label: t('Más ancho') },
                    ]} />
                </div>
              ))}
            </div>
          )}

          {paso === 2 && resultado && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className={`w-[96px] h-[96px] rounded-full border-[3px] flex flex-col items-center justify-center ${
                  resultado.sinStock ? 'border-amber-500' : 'border-green-700'
                }`}>
                  <span className="text-[32px] font-bold leading-none">{talleFinal}</span>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                    {t(resultado.sinStock ? 'Lo más parecido' : 'Mejor calce')}
                  </span>
                </div>
                <p className="text-[13px] text-center text-foreground/80 px-2">
                  {t(resultado.sinStock
                    ? (resultado.sinStock.enSuLugar
                      ? 'El talle que mejor te iba está sin stock: este es el más parecido que sí tenemos.'
                      : 'El talle que mejor te iba está sin stock por ahora.')
                    : resultado.resumen)}
                </p>
              </div>

              {resultado.lecturas.length > 0 && (
                <div className="border border-border rounded-[10px] overflow-hidden">
                  {resultado.lecturas.map(l => (
                    <div key={l.eje} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
                      <span className="text-[12px] font-medium w-[62px] flex-shrink-0">{t(l.etiqueta)}</span>
                      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${COLOR_ESTADO[l.estado]}`} />
                      <span className="text-[12px] text-muted-foreground leading-snug">{l.texto}</span>
                    </div>
                  ))}
                </div>
              )}

              {resultado.escala.length > 1 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('Tu talle')}</p>
                  <div className="flex gap-1.5">
                    {resultado.escala.map(s => (
                      <span key={s} className={`flex-1 h-9 flex items-center justify-center text-[12px] font-semibold uppercase border rounded-[8px] ${
                        s === talleFinal ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
                      }`}>{s}</span>
                    ))}
                  </div>
                  <div className="mt-1">
                    <div className="relative h-[5px] rounded-full bg-gradient-to-r from-amber-200 via-green-200 to-amber-200">
                      <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[11px] h-[11px] rounded-full bg-foreground border-2 border-white"
                        style={{ left: `${50 + resultado.posicionPecho * 46}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <span>{t('Al cuerpo')}</span>
                      <span>{t('Como fue cortada')}</span>
                      <span>{t('Suelta')}</span>
                    </div>
                  </div>
                </div>
              )}

              {resultado.alternativa && !resultado.sinStock && (
                <p className="text-[12px] text-muted-foreground">
                  {t(resultado.alternativa.tono === 'suelto' ? 'Si lo querés más suelto' : 'Si lo querés más al cuerpo')}
                  {': '}
                  <span className="font-semibold text-foreground uppercase">{resultado.alternativa.talle}</span>
                </p>
              )}

              <p className="text-[11px] text-muted-foreground leading-snug">
                {t('Comparamos tus medidas con la tabla de esta prenda. Es una guía, no una garantía: las prendas pueden variar 1 a 2 cm por confección.')}
                {' '}
                <span className="text-foreground">{t('Si dudás entre dos talles, elegí el más grande.')}</span>
              </p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 border-t border-border flex-shrink-0 flex flex-col gap-2">
          {paso < 2 ? (
            <>
              <button onClick={() => setPaso(p => p + 1)}
                className="w-full h-[50px] bg-bg-dark hover:bg-bg-dark/85 text-primary-foreground text-[13px] font-bold uppercase tracking-[0.1em] rounded-[10px] transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:active:scale-100">
                {t('Continuar')} →
              </button>
              {paso === 1 && (
                <button onClick={() => setPaso(0)} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  {t('Volver')}
                </button>
              )}
              <p className="text-[10px] text-center text-muted-foreground">
                {t('Tus respuestas quedan en este dispositivo. No se envían a ningún lado.')}
              </p>
            </>
          ) : resultado && (
            <>
              <button onClick={() => (tallesConStock.includes(talleFinal) ? onAgregar(talleFinal) : onCerrar())}
                className="w-full h-[50px] bg-bg-dark hover:bg-bg-dark/85 text-primary-foreground text-[13px] font-bold uppercase tracking-[0.1em] rounded-[10px] transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:active:scale-100">
                {tallesConStock.includes(talleFinal) ? `${t('Agregar talle')} ${talleFinal}` : t('Volver a la prenda')}
              </button>
              <div className="flex items-center justify-center gap-5">
                {tallesConStock.includes(talleFinal) && (
                  <button onClick={() => onElegir(talleFinal)}
                    className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] transition-colors">
                    {t('Elegirlo y seguir mirando')}
                  </button>
                )}
                <button onClick={() => setPaso(0)}
                  className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-[3px] transition-colors">
                  {t('Editar datos')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
