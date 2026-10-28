'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { registrarCyber, type ResultadoRegistro } from '@/lib/cyber-registro-cliente';
import { leerOrigen, type OrigenUtm } from '@/lib/cyber-utm';
import { fbLeadCyber } from '@/lib/fbpixel';

/**
 * "AVISAME CUANDO ABRA" — la única acción de la landing de CYBER HYPE.
 *
 * La lógica es la del PR #624 y no cambió: honeypot, tiempo mínimo, resultado
 * real del servidor (nada de "listo" cuando falló), y el `Lead` de Meta una
 * sola vez por visita y solo con el alta confirmada.
 *
 * Lo que cambió el 28/10 es la presentación. El formulario dejó de ser una
 * sección más abajo y pasó a ser el centro de la composición, así que:
 *  - campo y botón de 54 px, pegados, con el botón en negro pleno;
 *  - mientras manda, el botón NO se apaga —un botón al 60% parece deshabilitado
 *    y en mobile se lee como "no andás"—: cambia el texto y sigue en negro;
 *  - los tres errores tienen el mismo lugar y la misma forma, debajo del campo,
 *    sin mover nada de lo que está arriba;
 *  - el éxito reemplaza al formulario en el mismo bloque, con el mismo alto
 *    aproximado, para que la página no pegue un salto.
 *
 * Siempre se dibuja sobre superficie clara (la landing clara, o la tarjeta
 * blanca de la variante oscura), así que los tokens son los del sitio.
 */
export default function CyberAvisame() {
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState(''); // honeypot: queda vacío siempre
  const [estado, setEstado] = useState<'idle' | 'enviando' | ResultadoRegistro>('idle');
  const montadoEn = useRef<number>(Date.now());
  const leadEnviado = useRef(false);
  const enviado = email.trim().toLowerCase();

  const utm = useRef<OrigenUtm>({});

  // El reloj arranca cuando el componente se monta en el cliente, no cuando se
  // renderizó en el servidor: así una página cacheada no regala el tiempo.
  // En el mismo efecto se lee el origen: `location` solo existe en el browser.
  useEffect(() => {
    montadoEn.current = Date.now();
    utm.current = leerOrigen();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === 'enviando' || !email.trim()) return;
    setEstado('enviando');
    const r = await registrarCyber({
      email: email.trim(),
      empresa,
      ms: Date.now() - montadoEn.current,
      utm: utm.current,
    });
    setEstado(r);
    if (r === 'alta' && !leadEnviado.current) {
      leadEnviado.current = true;
      fbLeadCyber();
    }
  };

  if (estado === 'alta') {
    return (
      <div aria-live="polite" className="rounded-[12px] border border-foreground/12 bg-bg-alt px-5 py-6">
        <p className="text-[20px] font-semibold tracking-[-0.025em] text-foreground">
          Listo, quedaste anotado.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Te escribimos a <span className="font-medium text-foreground break-all">{enviado}</span> el
          lunes 2 de noviembre a las 00:00, cuando abra.
        </p>
        <p className="mt-3 text-[12px] text-text-light">
          Si no lo ves en la bandeja principal, mirá en Promociones.
        </p>
      </div>
    );
  }

  const error =
    estado === 'email-invalido' ? 'Revisá el mail: parece que falta algo.' :
    estado === 'demasiados-intentos' ? 'Ya lo intentaste varias veces. Esperá unos minutos.' :
    estado === 'error' ? 'No pudimos anotarte ahora. Probá de nuevo en un rato.' :
    null;

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="cyber-email" className="sr-only">Tu email</label>

      {/* Campo + botón como una sola pieza: en mobile apilados a ancho completo,
          en desktop el botón al lado para que la acción entre en una línea. */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id="cyber-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (estado !== 'idle' && estado !== 'enviando') setEstado('idle'); }}
          placeholder="tu@email.com"
          aria-invalid={estado === 'email-invalido'}
          aria-describedby="cyber-consentimiento"
          /* `flex-1` solo desde sm: en columna, `flex-basis:0` le gana a la
             altura y el campo se aplasta a la altura del texto (medido: 22 px
             en mobile). En fila sí hace falta para que ocupe el resto. */
          className="h-[54px] w-full min-w-0 shrink-0 rounded-[10px] border border-foreground/20 bg-white px-4 text-[16px] text-foreground placeholder:text-text-light focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 sm:flex-1"
        />
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="h-[54px] shrink-0 rounded-[10px] bg-foreground px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-85 disabled:cursor-wait"
        >
          {estado === 'enviando' ? 'Anotando…' : 'Avisame cuando abra'}
        </button>
      </div>

      {/* Honeypot. Fuera de la vista y fuera del alcance del teclado y del
          lector de pantalla: una persona no puede completarlo ni sin querer.
          Va posicionado fuera de pantalla en vez de `display:none` porque hay
          bots que saltean los campos ocultos por CSS. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="cyber-empresa">Empresa</label>
        <input
          id="cyber-empresa"
          name="empresa"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
        />
      </div>

      {/* Un solo lugar para los tres errores: aparece debajo del campo y no
          empuja nada de lo que está arriba. */}
      {error && (
        <p role="alert" className="mt-2.5 text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}

      {/* Texto de consentimiento v2 — si cambia, subir CYBER_CONSENT_VERSION en
          app/api/newsletter-subscribe/route.ts para que quede registrado qué
          aceptó cada contacto.

          La segunda frase está ahí por los contactos que alguna vez se dieron
          de baja (hoy 99 en la lista Newsletter). Completar este formulario los
          vuelve a anotar, y tienen que poder leer eso antes de dejar el mail, no
          enterarse cuando les llega. El endpoint lo cumple de verdad: los saca
          de las listas generales antes de levantar la baja. */}
      <p id="cyber-consentimiento" className="mt-3.5 text-[11.5px] leading-[1.55] text-muted-foreground">
        Al dejar tu mail aceptás recibir por correo los avisos de CYBER HYPE: los anticipos y la
        apertura del 2/11. Si alguna vez te diste de baja, esto te anota solo para el evento. Te
        podés dar de baja desde cualquier mail que te mandemos.{' '}
        <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-foreground">
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}
