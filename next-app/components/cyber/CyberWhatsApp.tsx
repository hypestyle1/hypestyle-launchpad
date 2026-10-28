'use client';

import { fbClickWhatsAppCyber } from '@/lib/fbpixel';
import { esGrupo } from '@/lib/cyber-whatsapp';

/**
 * Acceso al canal de avisos de CYBER HYPE por WhatsApp.
 *
 * Dos cosas que este componente NO hace, a propósito:
 *
 *  - **No da por anotado a nadie.** Un clic es un clic: que alguien abra la
 *    invitación no quiere decir que haya entrado al canal. El evento que manda
 *    a Meta es propio (`ClickWhatsAppCyber`) y está separado del `Lead`, que
 *    sigue siendo solo del alta de mail confirmada por el servidor. Mezclarlos
 *    haría que la campaña optimice a clics que no sabemos si terminaron en
 *    nada. El número real de seguidores lo dice WhatsApp, no el sitio.
 *  - **No cruza datos con Brevo.** Quien entra por acá no queda en la lista de
 *    mail, y quien deja el mail no entra al canal. Son dos consentimientos
 *    distintos y cada uno vale para lo suyo.
 *
 * `demo` dibuja el bloque sin href, para poder mostrar la composición antes de
 * que exista la invitación. Nunca se usa en producción: la página solo lo
 * activa con `?wa=demo` y únicamente mientras no haya enlace cargado.
 */
export default function CyberWhatsApp({ url, demo = false }: { url?: string; demo?: boolean }) {
  const grupo = url ? esGrupo(url) : false;

  const contenido = (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 fill-current">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.07-.13-.27-.2-.57-.35z"/>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.69-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.23 8.24z"/>
      </svg>
      <span>Unirme al WhatsApp de Cyber Hype</span>
    </>
  );

  const clases =
    'flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-foreground px-4 text-center text-[11.5px] font-bold uppercase leading-[1.25] tracking-[0.08em] text-primary-foreground transition-opacity sm:text-[12px] sm:tracking-[0.12em]';

  return (
    <div>
      {demo ? (
        // Vista previa de la composición: deliberadamente sin href ni clic.
        <div className={`${clases} opacity-100`} aria-disabled="true" role="button">
          {contenido}
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => fbClickWhatsAppCyber()}
          className={`${clases} hover:opacity-85`}
        >
          {contenido}
        </a>
      )}

      <p className="mt-2.5 text-[11.5px] leading-[1.5] text-text-light">
        {demo
          ? 'Avisos del evento y de los adelantos. Enlace pendiente: se activa cuando el canal esté creado y probado.'
          : grupo
            ? 'Avisos del evento y de los adelantos. Es un grupo: tu número queda a la vista del resto de los participantes.'
            : 'Avisos del evento y de los adelantos. Escribimos solo nosotros y tu número no lo ve nadie.'}
      </p>
    </div>
  );
}
