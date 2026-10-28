/**
 * La línea de corte del takeover: acá termina el evento y empieza la home de
 * siempre (Shop the Look, Visto en, el banner editorial, reseñas, Instagram).
 *
 * No es decoración. Durante el evento la home arranca con nueve bloques
 * comerciales seguidos; sin una marca explícita, lo editorial se lee como
 * "más oferta" y el visitante no entiende que ya vio todo lo del evento.
 */
export default function Hype72Corte() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-10 md:pt-14 pb-2">
      <div className="flex items-center gap-4">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
          Y además, como siempre
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
