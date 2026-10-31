import CyberWhatsApp from './CyberWhatsApp';

/* El canal de WhatsApp, como sección propia.

   ── Por qué cambió ──────────────────────────────────────────────────────────
   Estaba dentro de una tarjeta negra, sobre fondo negro, pegado a las
   preguntas y al footer: los tres bloques se leían como una sola masa oscura
   al final de la página y el botón no tenía dónde respirar. Ahora es una
   banda **clara**, que corta el negro del evento y separa con claridad la
   experiencia del footer habitual de Hype.

   Composición horizontal en desktop (mensaje a la izquierda, acción a la
   derecha) y apilada en mobile, con aire arriba y abajo. El enlace es el del
   canal real; si no hay invitación cargada, la sección entera no se monta —
   mejor nada que un botón que no lleva a ningún lado. */

export default function CyberCanal({ url }: { url: string }) {
  if (url === '') return null;

  return (
    <section className="bg-bg-alt px-4 py-14 text-foreground md:px-10 md:py-20">
      <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-7 md:flex-row md:items-center md:justify-between md:gap-14">
        <div className="max-w-[46ch]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-light md:text-[11px]">
            Canal oficial
          </p>
          {/* "Enterate antes que el feed" obligaba a entender la comparación
              para captar la ventaja. Este dice la misma idea con el sujeto
              que importa —los drops— y en tres palabras.
              Alternativas sobre la mesa: "Primero te enterás acá" (más
              atemporal, si el bloque algún día sale del evento) y "Los avisos
              salen por acá" (más literal, menos promesa). */}
          <h2 className="text-[24px] font-black uppercase leading-[0.98] tracking-[-0.01em] md:text-[32px]">
            Los drops, primero acá
          </h2>
          <p className="mt-3 text-[14px] leading-[1.55] text-muted-foreground md:text-[15px]">
            Cada lanzamiento del evento se avisa en el canal antes que en el feed. Es un canal:
            solo los avisos, y tu número queda a resguardo.
          </p>
        </div>

        <div className="w-full md:w-[330px] md:shrink-0">
          <CyberWhatsApp url={url} />
        </div>
      </div>
    </section>
  );
}
