'use client';

import { useState } from 'react';
import Link from 'next/link';
import { registrarCyber, type ResultadoRegistro } from '@/lib/cyber-registro-cliente';

/**
 * "AVISAME CUANDO ABRA" — la captación de la landing de CYBER HYPE.
 *
 * Tres cosas que el formulario anterior no hacía:
 *  1. **No miente.** Antes el submit era `try { await … } catch {}` y después
 *     mostraba "listo" igual: si Brevo fallaba, la persona se iba creyendo que
 *     estaba anotada. Ahora cada resultado tiene su estado y el error ofrece
 *     reintentar.
 *  2. **Consentimiento a la vista**, pegado al botón y no escondido abajo, con
 *     el link a la política de privacidad. La versión del texto se registra en
 *     el contacto (HYPE72_CONSENT) desde el endpoint.
 *  3. **Dice qué va a pasar y cuándo**: el mail llega el 2/11 a las 00:00. No
 *     promete acceso anticipado, ni precios, ni descuentos: no hay ninguno.
 *
 * Mobile primero: una sola columna, campo y botón de 52 px de alto (el pulgar
 * no falla), teclado de email, y el estado final reemplaza al formulario para
 * que no quede un campo vacío invitando a mandarlo de nuevo.
 */
export default function CyberAvisame() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | ResultadoRegistro>('idle');
  const enviado = email.trim().toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === 'enviando' || !email.trim()) return;
    setEstado('enviando');
    setEstado(await registrarCyber(email.trim()));
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

  if (estado === 'dado-de-baja') {
    return (
      <div aria-live="polite" className="border border-foreground/15 bg-bg-alt px-5 py-6 rounded-[8px]">
        <p className="text-[17px] md:text-[19px] font-semibold tracking-[-0.02em]">Ese mail está dado de baja.</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          En algún momento pediste no recibir más correos nuestros y lo respetamos: no te vamos a
          escribir. Si querés el aviso igual, escribinos por{' '}
          <a
            href="https://instagram.com/hypestylearg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            @hypestylearg
          </a>{' '}
          y lo arreglamos por ahí.
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
      {estado === 'error' && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          No pudimos anotarte ahora. Probá de nuevo en un rato.
        </p>
      )}

      {/* Texto de consentimiento v1 — si cambia, subir CYBER_CONSENT_VERSION en
          app/api/newsletter-subscribe/route.ts para que quede registrado qué
          aceptó cada contacto. */}
      <p id="cyber-consentimiento" className="text-[12px] leading-relaxed text-muted-foreground">
        Al dejar tu mail aceptás recibir el aviso de apertura y novedades de Hype por correo. Te
        podés dar de baja desde cualquier mail que te mandemos.{' '}
        <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-foreground">
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}
