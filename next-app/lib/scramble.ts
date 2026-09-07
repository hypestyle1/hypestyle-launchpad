/**
 * Lógica pura de ScrambleText (components/ui/scramble-text.tsx), separada para
 * poder testearla sin JSX.
 */

const CHARS = '-_~`!@#$%^&*()+=[]{}|;:,.<>?';
const DIGITS = '0123456789';

/** Grafemas, no code units: sin esto un emoji o una tilde compuesta se parte al
 *  medio y quedan caracteres rotos en pantalla. */
export function segmentar(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

function charAlAzar(pool: string) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Versión determinística, para el primer render. Si el servidor y el cliente
 *  sortearan distinto, React tiraría error de hidratación. */
function charEstable(segmento: string, index: number, pool: string) {
  let hash = index + 1;
  for (const c of segmento) {
    hash = (hash * 31 + (c.codePointAt(0) ?? 0)) % 2147483647;
  }
  return pool[hash % pool.length];
}

/**
 * Cifra los segmentos todavía no revelados.
 *
 * En modo `numeric` (montos) solo ruedan los dígitos, y con dígitos: el símbolo
 * de moneda, los puntos de miles y la coma se quedan en su lugar, así el total
 * se ve como un número que rueda y no como "$ >!;]%,]" por un instante.
 */
export function mezclar(segmentos: string[], revelados: number, estable = false, numeric = false): string {
  const pool = numeric ? DIGITS : CHARS;
  return segmentos
    .map((c, i) => {
      // Los espacios se dejan intactos: si se mezclan, la palabra pierde forma
      // y el texto salta de ancho en cada paso.
      if (c.trim() === '' || i < revelados) return c;
      if (numeric && !/\d/.test(c)) return c;
      return estable ? charEstable(c, i, pool) : charAlAzar(pool);
    })
    .join('');
}
