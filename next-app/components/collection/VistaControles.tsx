'use client';

import { PersonStanding, Shirt } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import type { VistaCols, VistaFoto } from '@/lib/catalogo-vista';

/**
 * Selector de vista del catálogo: 1, 2 o 3 columnas, y mockup o modelo.
 * El estado vive en `useVistaCatalogo` (localStorage), así que la elección
 * sigue puesta al cambiar de categoría o al volver al día siguiente.
 */
interface Props {
  cols: VistaCols;
  setCols: (v: VistaCols) => void;
  foto: VistaFoto;
  setFoto: (v: VistaFoto) => void;
  className?: string;
}

const OPCIONES: VistaCols[] = [1, 2, 3];

export default function VistaControles({ cols, setCols, foto, setFoto, className = '' }: Props) {
  const { t } = useLocale();

  const btn = (activo: boolean) =>
    `h-7 px-2.5 text-[11px] font-medium rounded-[5px] border transition-colors ${
      activo
        ? 'border-foreground/70 bg-foreground text-primary-foreground'
        : 'border-border text-foreground/60 hover:border-foreground/40 hover:text-foreground'
    }`;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-1" role="group" aria-label={t('Columnas')}>
        {OPCIONES.map((n) => (
          <button key={n} type="button" onClick={() => setCols(n)} className={btn(cols === n)}
            aria-pressed={cols === n} aria-label={`${n} ${n === 1 ? t('columna') : t('columnas')}`}>
            {n}
          </button>
        ))}
      </div>

      <span aria-hidden className="w-px h-4 bg-border mx-0.5" />

      <div className="flex items-center gap-1" role="group" aria-label={t('Foto')}>
        <button type="button" onClick={() => setFoto('mockup')} className={`${btn(foto === 'mockup')} flex items-center`}
          aria-pressed={foto === 'mockup'} aria-label={t('Ver la prenda sola')} title={t('Ver la prenda sola')}>
          <Shirt className="w-3.5 h-3.5" strokeWidth={1.4} />
        </button>
        <button type="button" onClick={() => setFoto('modelo')} className={`${btn(foto === 'modelo')} flex items-center`}
          aria-pressed={foto === 'modelo'} aria-label={t('Ver puesta')} title={t('Ver puesta')}>
          <PersonStanding className="w-3.5 h-3.5" strokeWidth={1.4} />
        </button>
      </div>
    </div>
  );
}
