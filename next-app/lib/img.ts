export function imgSrc(src?: string | null): string {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return `/${src}`;
}
