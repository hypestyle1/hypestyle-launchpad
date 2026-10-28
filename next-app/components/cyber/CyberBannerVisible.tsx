'use client';

import { useEffect, useState } from 'react';

/**
 * Envoltorio que hace desaparecer el banner de la previa en cuanto pasa la hora
 * de apertura, sin depender de que la home se vuelva a renderizar.
 *
 * Por qué existe: la decisión de mostrarlo la toma el servidor
 * (`cyberCapturaAbierta()`), que es lo correcto — el reloj del visitante no
 * puede adelantar nada. Pero si el HTML de la home quedó cacheado antes del
 * 2/11, un visitante podría encontrarse el banner de "falta tanto" con el
 * contador clavado en cero justo la noche que abre. Esto lo corta.
 *
 * Al revés no funciona ni se intenta: esto solo puede **ocultar**. Nunca
 * muestra algo que el servidor decidió no mostrar.
 */
export default function CyberBannerVisible({
  hastaIso,
  children,
}: {
  hastaIso: string;
  children: React.ReactNode;
}) {
  const hasta = new Date(hastaIso).getTime();
  const [tapado, setTapado] = useState(false);

  useEffect(() => {
    const revisar = () => setTapado(Date.now() >= hasta);
    revisar();
    const id = setInterval(revisar, 1000);
    return () => clearInterval(id);
  }, [hasta]);

  if (tapado) return null;
  return <>{children}</>;
}
