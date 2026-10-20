'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Preferencia de vista del catálogo (referencia: emestudios.com, 19/10/2026).
 *
 * Dos cosas que elige el visitante y le quedan guardadas: cuántas columnas ve
 * y si la foto que manda en cada card es el mockup o el modelo. En mobile —de
 * donde sale el 84% de las compras— una sola columna muestra la estampa a
 * ancho completo, que es lo que no se podía ver antes.
 *
 * Se guarda en localStorage, no en la URL: es una preferencia de la persona,
 * no un estado para compartir por link. Arranca siempre en el default (2
 * columnas, mockup) y lee lo guardado en un efecto, para que el HTML del
 * servidor y el del primer render del cliente sean el mismo.
 */

export type VistaCols = 1 | 2 | 3;
export type VistaFoto = 'mockup' | 'modelo';

const CLAVE_COLS = 'hs_vista_cols';
const CLAVE_FOTO = 'hs_vista_foto';

export const COLS_DEFAULT: VistaCols = 2;
export const FOTO_DEFAULT: VistaFoto = 'mockup';

/**
 * Grilla por cantidad de columnas. La de 2 es exactamente la de siempre
 * (`GRID_AIRE`), así que la vista por defecto no cambia ni un pixel. En
 * desktop cada opción duplica: 1→2, 2→4, 3→6.
 */
export const GRID_POR_COLS: Record<VistaCols, string> = {
  1: 'grid grid-cols-1 lg:grid-cols-2 gap-x-2 md:gap-x-3 gap-y-8 lg:gap-y-10',
  2: 'grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-3 gap-y-7 lg:gap-y-9',
  3: 'grid grid-cols-3 lg:grid-cols-6 gap-x-1.5 md:gap-x-2 gap-y-5 lg:gap-y-7',
};

const esCols = (v: unknown): v is VistaCols => v === 1 || v === 2 || v === 3;
const esFoto = (v: unknown): v is VistaFoto => v === 'mockup' || v === 'modelo';

export function useVistaCatalogo() {
  const [cols, setColsState] = useState<VistaCols>(COLS_DEFAULT);
  const [foto, setFotoState] = useState<VistaFoto>(FOTO_DEFAULT);

  useEffect(() => {
    try {
      const c = Number(localStorage.getItem(CLAVE_COLS));
      if (esCols(c)) setColsState(c);
      const f = localStorage.getItem(CLAVE_FOTO);
      if (esFoto(f)) setFotoState(f);
    } catch {
      // Safari en privado tira al tocar localStorage: se queda con el default.
    }
  }, []);

  const setCols = useCallback((v: VistaCols) => {
    setColsState(v);
    try { localStorage.setItem(CLAVE_COLS, String(v)); } catch {}
  }, []);

  const setFoto = useCallback((v: VistaFoto) => {
    setFotoState(v);
    try { localStorage.setItem(CLAVE_FOTO, v); } catch {}
  }, []);

  return { cols, setCols, foto, setFoto, grid: GRID_POR_COLS[cols] };
}
