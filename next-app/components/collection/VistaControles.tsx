'use client';

import { useEffect, useState } from 'react';
import { PersonStanding, Shirt } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import type { VistaCols, VistaFoto } from '@/lib/catalogo-vista';

/**
 * Selector de vista del catálogo: columnas, y la prenda sola o puesta. El
 * estado vive en `useVistaCatalogo` (localStorage), así que la elección sigue
 * puesta al cambiar de categoría o al volver mañana.
 *
 * La opción activa lleva el nombre escrito ("Vista 2", "Prenda", "Puesta") y
 * las otras quedan como número o ícono: con íconos solos no se entendía para
 * qué servía (referencia: emestudios.com, 19/10/2026).
 *
 * **El número es el que se ve de verdad.** En desktop cada opción muestra el
 * doble (2, 4, 6), que es lo que dibuja la grilla; decía "Vista 3" y se veían
 * seis columnas.
 */
interface Props {
  cols: VistaCols;
  setCols: (v: VistaCols) => void;
  foto: VistaFoto;
  setFoto: (v: VistaFoto) => void;
  className?: string;
}

const OPCIONES: VistaCols[] = [1, 2, 3];

const GRUPO = 'flex items-center gap-1 p-1 rounded-[8px] bg-black/[0.045]';

const btn = (activo: boolean) =>
  `h-7 px-2.5 text-[11.5px] font-medium rounded-[6px] transition-all duration-150 flex items-center gap-1.5 ${
    activo
      ? 'bg-white text-foreground shadow-[0_1px_5px_rgba(0,0,0,0.13)] border border-black/[0.06]'
      : 'text-foreground/55 hover:text-foreground border border-transparent'
  }`;

/** Si la grilla está en modo desktop (lg), donde cada opción vale el doble. */
function useEsDesktop() {
  const [esDesktop, setEsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const aplicar = () => setEsDesktop(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);
  return esDesktop;
}

export default function VistaControles({ cols, setCols, foto, setFoto, className = '' }: Props) {
  const { t } = useLocale();
  const esDesktop = useEsDesktop();
  const numero = (n: VistaCols) => (esDesktop ? n * 2 : n);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={GRUPO} role="group" aria-label={t('Columnas')}>
        {OPCIONES.map((n) => (
          <button key={n} type="button" onClick={() => setCols(n)} className={btn(cols === n)}
            aria-pressed={cols === n}
            aria-label={`${numero(n)} ${numero(n) === 1 ? t('columna') : t('columnas')}`}>
            {cols === n ? `${t('Vista')} ${numero(n)}` : numero(n)}
          </button>
        ))}
      </div>

      <div className={GRUPO} role="group" aria-label={t('Cómo se ve la foto')}>
        <button type="button" onClick={() => setFoto('mockup')} className={btn(foto === 'mockup')}
          aria-pressed={foto === 'mockup'} title={t('Ver la prenda sola')}>
          <Shirt className="w-3.5 h-3.5" strokeWidth={1.4} />
          {foto === 'mockup' && <span>{t('Prenda')}</span>}
        </button>
        <button type="button" onClick={() => setFoto('modelo')} className={btn(foto === 'modelo')}
          aria-pressed={foto === 'modelo'} title={t('Ver la prenda puesta')}>
          <PersonStanding className="w-3.5 h-3.5" strokeWidth={1.4} />
          {foto === 'modelo' && <span>{t('Puesta')}</span>}
        </button>
      </div>
    </div>
  );
}
