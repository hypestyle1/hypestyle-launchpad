import { normalizeCpAr } from '@/lib/postal-code';
import type { TarifaEnvio } from '@/lib/envio';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL || 'https://lightpink-rook-704850.hostingersite.com';

/**
 * Tarifas de Andreani para un CP, vía el tarifario del plugin en WordPress.
 * La usan /api/andreani-rates (lo que ve el checkout) y la creación del pedido
 * (lo que se cobra), así que las dos ven las mismas opciones y costos.
 */
export async function cotizarAndreani(args: {
  cp: string; provincia?: string; valor?: number | string; peso?: number | string;
}): Promise<{ rates?: TarifaEnvio[]; error?: string }> {
  const cp = normalizeCpAr(args.cp);
  if (!cp) return { error: 'cp requerido' };
  const body = new URLSearchParams({
    action: 'hype_shipping_rates',
    cp,
    provincia: args.provincia ?? '',
    valor: String(args.valor ?? '10000'),
    peso: String(args.peso ?? '0.5'),
  });
  const res = await fetch(`${WP_URL}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });
  return res.json();
}
