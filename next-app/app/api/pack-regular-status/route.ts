import { NextResponse } from 'next/server';
import {
  PACK_REGULAR_X4_DESDE,
  PACK_REGULAR_X4_HASTA,
  packRegularUnidades,
} from '@/lib/promo-pack-regular';

/**
 * Tamaño del pack libre de Regular Tees según la hora del SERVIDOR.
 *
 * El navegador no puede decidir la ventana del evento HYPE 72: con el reloj de
 * la máquina adelantado a mano, el carrito mostraría "pagás 3, llevás 4" fuera
 * de fecha y después el servidor cobraría otra cosa. Acá se resuelve con
 * Date.now() del servidor y el navegador solo lee el resultado.
 *
 * No toca WordPress ni la base: es una comparación de fechas. Sin caché (la
 * respuesta cambia a la medianoche del 2/11 y a la del 9/11, y un `max-age` del
 * CDN dejaría la ventana abierta o cerrada de más).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const ahora = Date.now();
  const unidades = packRegularUnidades(ahora);
  return NextResponse.json(
    {
      unidades,
      x4: unidades === 4,
      desde: new Date(PACK_REGULAR_X4_DESDE).toISOString(),
      hasta: new Date(PACK_REGULAR_X4_HASTA).toISOString(),
      serverTime: new Date(ahora).toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
