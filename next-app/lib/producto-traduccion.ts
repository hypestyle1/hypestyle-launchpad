import { unstable_cache } from 'next/cache';
import type { Language } from '@/context/LocaleContext';

// Traducción por IA de los textos de catálogo de un producto: la descripción
// (texto plano, ya stripeado en product-detail.ts) y la ficha del modelo
// (HTML simple de Woo con <p> y <strong>).
//
// Por qué existe: el selector de idioma traduce la interfaz con el diccionario
// de lib/i18n.ts, pero la descripción viene de WooCommerce en español y no hay
// forma de tenerla a mano en cinco idiomas para ~110 productos que cambian.
//
// Cómo funciona:
//   - Mismo proveedor y misma clave que lib/traducir.ts (postulaciones):
//     OPENAI_API_KEY ya está en Vercel, no hace falta sumar otra.
//   - La traducción se cachea en el Data Cache de Next (unstable_cache) 30
//     días. La clave incluye el texto original: si la descripción cambia en
//     Woo, la clave cambia y se vuelve a traducir sola. Si falla, no se
//     cachea el error y el próximo pedido reintenta.
//   - Nunca rompe la ficha: ante cualquier fallo la ruta responde error y el
//     cliente sigue mostrando el español.

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').replace(/^﻿/, '').trim();
const MODELO = process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4o-mini';

export const IDIOMAS_TRADUCIBLES = ['EN', 'PT', 'DE', 'FR', 'IT'] as const;
export type IdiomaTraducible = (typeof IDIOMAS_TRADUCIBLES)[number];

const NOMBRE_IDIOMA: Record<IdiomaTraducible, string> = {
  EN: 'English',
  PT: 'Português (Brasil)',
  DE: 'Deutsch',
  FR: 'Français',
  IT: 'Italiano',
};

export function esIdiomaTraducible(v: string): v is IdiomaTraducible {
  return (IDIOMAS_TRADUCIBLES as readonly string[]).includes(v);
}

export function hayClaveDeTraduccion(): boolean {
  return OPENAI_API_KEY.length > 0;
}

export interface TextosProducto {
  /** Descripción en texto plano: párrafos separados por líneas vacías, viñetas con "•". */
  description: string;
  /** Ficha del modelo (HTML simple) o vacío si el producto no tiene. */
  modelInfo: string;
}

const INSTRUCCIONES = `Sos el traductor de la tienda online de Hype, una marca argentina de streetwear.

Te paso la descripción de un producto (texto plano) y, si tiene, la ficha del modelo (HTML simple).
Devolvés SOLO un objeto JSON, sin explicaciones ni markdown, con este formato exacto:
{"description":"<descripción traducida>","modelInfo":"<ficha traducida, o cadena vacía si venía vacía>"}

Reglas:
- Traducí al idioma pedido con naturalidad. Tono de marca de moda joven: directo, sin sonar a manual.
- Respetá EXACTAMENTE la estructura del texto: mismos saltos de línea, mismas líneas vacías y
  mismas viñetas ("•") al principio de línea. Una línea del original = una línea de la traducción.
- NO traduzcas ni cambies: nombres de productos y colecciones (ej. "Mesh Camo Blue – Tee", "La Nuestra"),
  nombres de marca (Hype, Hypestyle), marcas registradas (RealTree™), talles (S, M, L, XL), medidas,
  números, porcentajes, fechas, URLs ni códigos. Van tal cual aparecen.
- Términos de streetwear que se usan en inglés en todos los idiomas quedan en inglés: oversize,
  boxy fit, regular fit, hoodie, drop, tee, mesh, camo.
- En modelInfo conservá las etiquetas HTML tal cual (<p>, <strong>, <br>) y traducí solo el texto.
- No agregues ni saques información. Si una frase ya está en el idioma pedido, dejala igual.`;

/**
 * Valida lo que devolvió el modelo. Exportada para testearla sin pegarle a
 * OpenAI. Devuelve null si la respuesta no sirve (JSON roto, descripción
 * vacía, tipos raros): en ese caso NO se cachea nada y se muestra el español.
 */
export function parsearRespuesta(crudo: string, original: TextosProducto): TextosProducto | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { description, modelInfo } = parsed as Record<string, unknown>;

  const desc = typeof description === 'string' ? description.trim() : '';
  if (original.description && !desc) return null;

  // Si el producto no tenía ficha del modelo, no se acepta una inventada.
  const ficha = original.modelInfo && typeof modelInfo === 'string' ? modelInfo.trim() : '';

  return { description: desc, modelInfo: ficha };
}

/** Llama a OpenAI. Lanza si algo falla: el que cachea decide qué hacer. */
export async function traducirTextosProducto(
  textos: TextosProducto,
  lang: IdiomaTraducible,
): Promise<TextosProducto> {
  if (!OPENAI_API_KEY) throw new Error('falta OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: INSTRUCCIONES },
        {
          role: 'user',
          content: `Idioma pedido: ${NOMBRE_IDIOMA[lang]}\n\n${JSON.stringify({
            description: textos.description,
            modelInfo: textos.modelInfo || '',
          })}`,
        },
      ],
    }),
    // Una demora de OpenAI no puede colgar la función: el cliente muestra el
    // español y reintenta en la próxima visita.
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`OpenAI respondió ${res.status}: ${await res.text().catch(() => '')}`);
  }

  const data = await res.json();
  const crudo: unknown = data?.choices?.[0]?.message?.content;
  if (typeof crudo !== 'string') throw new Error('OpenAI devolvió una respuesta vacía');

  const resultado = parsearRespuesta(crudo, textos);
  if (!resultado) throw new Error('OpenAI devolvió un JSON que no sirve');
  return resultado;
}

/**
 * Versión cacheada 30 días. Los argumentos (idioma + textos originales) forman
 * parte de la clave, así que un cambio en la descripción de Woo invalida solo.
 * Un throw adentro no se cachea: el próximo request vuelve a intentar.
 */
export const traducirTextosProductoCacheado = unstable_cache(
  (lang: IdiomaTraducible, description: string, modelInfo: string) =>
    traducirTextosProducto({ description, modelInfo }, lang),
  ['producto-traduccion-v1'],
  { revalidate: 60 * 60 * 24 * 30, tags: ['producto-traduccion'] },
);

/** Idiomas del selector que necesitan traducción por IA (todos menos ES). */
export function necesitaTraduccion(lang: Language): lang is IdiomaTraducible {
  return lang !== 'ES' && esIdiomaTraducible(lang);
}
