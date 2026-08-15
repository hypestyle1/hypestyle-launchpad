import Link from 'next/link';
import { imgSrc } from '@/lib/img';
import type { PublicReview } from '@/lib/reviews/types';
import StarRating from './StarRating';

/**
 * La zona horaria va FIJA a propósito, no se deja librada a la del visitante.
 *
 * Esta card se renderiza en el servidor (las reseñas del home vienen por props
 * desde app/page.tsx). Sin `timeZone`, `toLocaleDateString` usa la zona de quien
 * ejecuta: en Vercel eso es UTC y en el visitante argentino es UTC−3. Toda
 * reseña creada entre las 00:00 y las 03:00 UTC se renderizaba con un día en el
 * HTML del servidor y con el día anterior al hidratar.
 *
 * Ese texto distinto es un error de hidratación (React #425), y como ocurre
 * fuera de un Suspense boundary React responde tirando a la basura TODO el HTML
 * del servidor y volviendo a renderizar el home entero en el cliente (#423).
 * El resultado visible era que la página se armaba, se desarmaba y se volvía a
 * armar sola durante los primeros segundos — y si el usuario scrolleaba en esa
 * ventana, el contenido le saltaba abajo del dedo.
 *
 * Verificado: con el navegador en UTC (igual que el servidor) los errores no
 * aparecían; en America/Argentina/Buenos_Aires aparecían los tres, siempre.
 */
const REVIEW_TZ = 'America/Argentina/Buenos_Aires';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: REVIEW_TZ,
  });
}

export default function ReviewCard({ review, compact = false }: { review: PublicReview; compact?: boolean }) {
  // incentivized/isDemo/verified se mantienen en el modelo (PublicReview) pero
  // no se muestran como badge en la card — solo el aviso general de la página/sección.
  const { customerName, rating, text, createdAt, productName, productSlug, productImage, isDemo } = review;

  return (
    <article className="border border-border rounded-[10px] p-5 bg-white flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StarRating rating={rating} size={14} />
          <p className="text-[13px] font-semibold mt-1.5">{customerName}</p>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(createdAt)}</span>
      </div>

      <p className={`text-[13px] text-foreground/80 leading-relaxed ${compact ? 'line-clamp-3' : ''}`}>{text}</p>

      {productName && (
        <div className="mt-auto pt-3 border-t border-border/70 flex items-center gap-2.5">
          {productImage && (
            <div className="w-9 h-9 rounded-[5px] bg-bg-alt overflow-hidden flex-shrink-0">
              <img
                src={imgSrc(productImage)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          {productSlug && !isDemo ? (
            <Link href={`/producto/${productSlug}/`} className="text-[12px] text-foreground/60 hover:text-foreground transition-colors truncate">
              {productName}
            </Link>
          ) : (
            <span className="text-[12px] text-foreground/60 truncate">{productName}</span>
          )}
        </div>
      )}
    </article>
  );
}
