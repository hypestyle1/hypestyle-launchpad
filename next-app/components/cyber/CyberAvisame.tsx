'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { registrarCyber, type ResultadoRegistro } from '@/lib/cyber-registro-cliente';
import { fbLeadCyber } from '@/lib/fbpixel';

/**
 * "AVISAME CUANDO ABRA" — la captación de la landing de CYBER HYPE.
 *
 * Lo que este formulario hace distinto del que había:
 *  1. **No miente.** Antes el submit era `try { await … } catch {}` y después
 *     mostraba "listo" igual: si Brevo fallaba, la persona se iba creyendo que
 *     estaba anotada. Ahora cada resultado tiene su estado y el error ofrece
 *     reintentar.
 *  2. **Consentimiento a la vista**, pegado al botón y no escondido abajo, con
 *     el link a la política de privacidad. La versión del texto se registra en
 *     el contacto (HYPE72_CONSENT) desde el endpoint.
 *  3. **Dice qué va a pasar y cuándo**: el mail llega el 2/11 a las 00:00. No
 *     promete acceso anticipado, ni precios, ni descuentos: no hay ninguno.
 *  4. **Trampa de bots sin CAPTCHA**: un campo honeypot que ninguna persona ve
 *     ni puede tabular, y el tiempo que pasó desde que se montó el formulario.
 *     Nada de esto le agrega un paso a nadie.
 *
 * Mobile primero: una sola columna, campo y botón de 52 px de alto (el pulgar
 * no falla), teclado de email, y el estado final reemplaza al formulario para
 * que no quede un campo vacío invitando a mandarlo de nuevo. Probado a 375,
 * 390 y 430 px.
 *
 * El `Lead` de Meta sale una sola vez por visita y solo cuando el servidor
 * confirmó el alta (ver lib/fbpixel → fbLeadCyber).
 */
export default function CyberAvisame() {
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState(''); // honeypot: queda vacío siempre
  const [estado, setEstado] = useState<'idle' | 'enviando' | ResultadoRegistro>('idle');
  const montadoEn = useRef<number>(Date.now());
  const leadEnviado = useRef(false);
  const enviado = email.trim().toLowerCase();

  // El reloj arranca cuando el componente se monta en el cliente, no cuando se
  // renderizó en el servidor: así una página cacheada no regala el tiempo.
  useEffect(() => { montadoEn.current = Date.now(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === 'enviando' || !email.trim()) return;
    setEstado('enviando');
    const r = await registrarCyber({
      email: email.trim(),
      empresa,
      ms: Date.now() - montadoEn.current,
    });
    setEstado(r);
    if (r === 'alta' && !leadEnviado.current) {
      leadEnviado.current = true;
      fbLeadCyber();
    }
  };

  if (estado === 'alta') {
    return (
      <div aria-live="polite" className="border border-foreground/15 bg-bg-alt px-5 py-6 rounded-[8px]">
        <p className="text-[19px] md:text-[22px] font-semibold tracking-[-0.02em]">Listo, quedaste anotado.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Te escribimos a <span className="font-medium text-foreground break-all">{enviado}</span> el lunes
          2 de noviembre a las 00:00, cuando abra. Antes te mandamos los anticipos.
        </p>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Si no lo ves en la bandeja principal, mirá en Promociones o en spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor="cyber-email" className="sr-only">Tu email</label>
      <input
        id="cyber-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        spellCheck={false}
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (estado !== 'idle') setEstado('idle'); }}
        placeholder="tu@email.com"
        aria-invalid={estado === 'email-invalido'}
        aria-describedby="cyber-consentimiento"
        className="h-[52px] w-full min-w-0 rounded-[8px] border border-border-mid bg-white px-4 text-[16px] text-foreground placeholder:text-text-light focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
      />

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

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="h-[52px] w-full rounded-[8px] bg-foreground text-[12px] font-bold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {estado === 'enviando' ? 'Anotando…' : 'Avisame cuando abra'}
      </button>

      {estado === 'email-invalido' && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          Revisá el mail: parece que falta algo.
        </p>
      )}
      {estado === 'demasiados-intentos' && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          Ya lo intentaste varias veces. Esperá unos minutos y probá de nuevo.
        </p>
      )}
      {estado === 'error' && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          No pudimos anotarte ahora. Probá de nuevo en un rato.
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
      <p id="cyber-consentimiento" className="text-[12px] leading-relaxed text-muted-foreground">
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
