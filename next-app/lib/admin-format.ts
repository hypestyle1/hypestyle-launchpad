// Formateo compartido del panel admin. Antes cada pantalla traía su propia
// copia de fmt()/fmtDate()/waLink() (7-9 copias, con variantes que divergían).
// Acá vive la versión canónica; las pantallas migran a medida que se tocan.

/** Moneda ARS sin decimales: $ 1.234.567 */
export function fmtARS(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

/** 26/08/26 */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** 26/08/26 14:30 */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
       + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** hoy · ayer · hace 3d · hace 2m · hace 1a */
export function fmtRelative(s: string | null | undefined): string | null {
  if (!s) return null;
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}m`;
  return `hace ${Math.floor(months / 12)}a`;
}

export function daysSince(s: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000));
}

/** Link de WhatsApp con teléfono argentino normalizado (0-inicial fuera, 549 delante). */
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const clean  = digits.startsWith('0') ? digits.slice(1) : digits;
  const intl   = clean.startsWith('54') ? clean : '549' + clean;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
