'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Consignacion } from '@/lib/mayorista-consignacion';

// Los datos de la cuenta que necesita toda la vitrina del portal: el nombre
// del local, su pedido mínimo y —si la cuenta trabaja así— el acuerdo de
// consignación.
//
// Vive en un provider y no en cada componente porque la modalidad cambia lo
// que muestra CADA precio (card, ficha, carrito): con un fetch por componente,
// la grilla haría una consulta por producto y además podrían pintar cosas
// distintas mientras llegan las respuestas.

export interface PerfilMayorista {
  name: string;
  minOrder: number | null;
  /** null = cuenta de compra normal (50% del PVP). */
  consignacion: Consignacion | null;
}

interface Value extends PerfilMayorista {
  /** false hasta que respondió /api/mayorista/perfil. */
  listo: boolean;
}

const VACIO: Value = { name: '', minOrder: null, consignacion: null, listo: false };

const Ctx = createContext<Value>(VACIO);

// Pantallas sin sesión: pedir el perfil ahí da 401 seguro.
const SIN_SESION = ['/mayoristas/login', '/mayoristas/solicitud', '/mayoristas/reset'];

/**
 * `consignacionInicial` la resuelve el layout en el servidor
 * (lib/mayorista-consignacion-server.ts). Sin eso, la grilla salía un instante
 * con el precio mayorista y después saltaba al de lista.
 */
export function MayoristaPerfilProvider({ children, consignacionInicial = null }: { children: ReactNode; consignacionInicial?: Consignacion | null }) {
  const [value, setValue] = useState<Value>({ ...VACIO, consignacion: consignacionInicial });

  useEffect(() => {
    if (SIN_SESION.some(p => window.location.pathname.startsWith(p))) return;
    let cancelado = false;
    fetch('/api/mayorista/perfil')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelado || !data) return;
        const b = data.billing;
        setValue({
          name: b ? (b.company || `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()) : '',
          minOrder: typeof data.minOrder === 'number' ? data.minOrder : null,
          // Si el perfil no responde, queda el valor que trajo el servidor.
          consignacion: data.consignacion ?? consignacionInicial,
          listo: true,
        });
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [consignacionInicial]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMayoristaPerfil(): Value {
  return useContext(Ctx);
}
