export function formatArs(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}
