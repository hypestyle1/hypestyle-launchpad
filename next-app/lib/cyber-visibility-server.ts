import { cookies } from 'next/headers';
import { cyberEstado } from './cyber-hype';
import { COOKIE_CYBER, cookieValida, cyberBloqueado } from './cyber-gate';

/**
 * Decide si este request puede ver la experiencia completa de CYBER HYPE.
 *
 * La activación comercial sigue viviendo en sus relojes propios (drops,
 * precios y packs). Esta función sólo separa la VISIBILIDAD del diseño:
 * durante el cierre previo a las 19:00 lo ve quien ya pasó el gate con una
 * cookie firmada; desde las 19:00 lo sigue decidiendo la fase normal.
 */
export async function cyberTakeoverVisible(ahora: number = Date.now()): Promise<boolean> {
  const estado = cyberEstado(new Date(ahora));
  if (estado === 'evento') return true;
  if (estado !== 'previa' || !cyberBloqueado(ahora)) return false;

  const secreto = (process.env.EARLY_ACCESS_PASSWORD ?? '').trim();
  const token = cookies().get(COOKIE_CYBER)?.value;
  return cookieValida(token, secreto, ahora);
}
