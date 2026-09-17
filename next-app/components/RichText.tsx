import { Fragment } from 'react';
import type { Block } from '@/lib/pages/types';

// Pinta un string con `**negrita**` y `[texto](url)` como React. Es lo mínimo
// para que el contenido traducido de lib/pages/ viva en .ts sin JSX. Los
// links externos abren en otra pestaña; los internos (/ruta/) navegan normal.
const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[1] !== undefined) {
      out.push(<strong key={i++}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const external = /^(https?:|mailto:)/.test(href);
      out.push(
        <a
          key={i++}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="underline hover:text-foreground/70 transition-colors"
        >
          {m[2]}
        </a>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, k) => <Fragment key={k}>{n}</Fragment>)}</>;
}

/** Pinta los bloques de una sección (párrafos y listas) con la tipografía de las páginas legales. */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        if ('ol' in b) {
          return (
            <ol key={i} className="list-decimal list-inside space-y-2">
              {b.ol.map((it, j) => <li key={j}><RichText text={it} /></li>)}
            </ol>
          );
        }
        if ('ul' in b) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1">
              {b.ul.map((it, j) => <li key={j}><RichText text={it} /></li>)}
            </ul>
          );
        }
        return (
          <p key={i} className={b.strong ? 'font-medium' : undefined}>
            <RichText text={b.p} />
          </p>
        );
      })}
    </div>
  );
}
