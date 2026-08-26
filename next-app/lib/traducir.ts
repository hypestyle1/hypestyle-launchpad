// Traducción de las respuestas abiertas de una postulación al español.
//
// El equipo trabaja en español. Si alguien se postula en inglés —o escribe en
// inglés aunque tenga el formulario en español— el panel tiene que poder
// leerlo sin copiar y pegar en un traductor.
//
// Reglas que importan y por las que esto no es un traductor literal:
//   - El original NUNCA se toca. La traducción va aparte.
//   - No se traducen nombres propios, usernames, @, URLs, mails, teléfonos,
//     números ni marcas. Traducir "@maddieinlondon" o "Nike" rompe el dato.
//   - Se conserva el tono. Alguien que escribe suelto tiene que leerse suelto.
//   - Si la respuesta YA está en español, no se traduce: se marca y listo.
//
// Nunca bloquea el guardado de una postulación: si esto falla, la postulación
// queda igual y marcada como pendiente, para reintentar desde el panel.

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').replace(/^﻿/, '').trim();
const MODELO = process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4o-mini';

/** Campos de texto libre. El resto son estructurados y se normalizan solos. */
export const CAMPOS_ABIERTOS = ['porque', 'prenda', 'links', 'marcas'] as const;
export type CampoAbierto = (typeof CAMPOS_ABIERTOS)[number];

export type EstadoTraduccion = 'ok' | 'pendiente' | 'no_hace_falta';

export interface ResultadoTraduccion {
  estado: EstadoTraduccion;
  idiomaDetectado: string;
  traducciones: Partial<Record<CampoAbierto, string>>;
}

const INSTRUCCIONES = `Sos un traductor para el equipo de una marca argentina de streetwear.

Te paso las respuestas de un formulario donde alguien se postula para crear contenido.
Devolvés SOLO un objeto JSON, sin explicaciones ni markdown.

Formato exacto:
{"idioma":"<nombre del idioma predominante, en español: English, Español, Português, Italiano...>",
 "es_espanol": true|false,
 "traducciones": {"<campo>":"<texto en español rioplatense>"}}

Reglas:
- Si el texto ya está en español, poné "es_espanol": true y "traducciones": {}.
- Traducí al español rioplatense (vos, no tú). Natural, no literal.
- Conservá el tono: si escribe informal, traducí informal.
- NUNCA traduzcas ni alteres: nombres de personas, usernames, @ de redes,
  URLs, mails, teléfonos, números, métricas, nombres de marcas ni códigos.
  Van tal cual aparecen.
- El campo "links" suele ser solo URLs: si no tiene prosa, devolvelo igual.
- No agregues texto que la persona no escribió.`;

/** Detecta el idioma y traduce los campos abiertos en una sola llamada. */
export async function traducirPostulacion(
  campos: Partial<Record<CampoAbierto, string>>,
): Promise<ResultadoTraduccion> {
  const conTexto = Object.fromEntries(
    CAMPOS_ABIERTOS.map((c) => [c, (campos[c] || '').trim()]).filter(([, v]) => (v as string).length > 0),
  ) as Partial<Record<CampoAbierto, string>>;

  // Nada que traducir: no es un fallo, es que no había texto.
  if (Object.keys(conTexto).length === 0) {
    return { estado: 'no_hace_falta', idiomaDetectado: '', traducciones: {} };
  }

  if (!OPENAI_API_KEY) {
    console.error('[traducir] falta OPENAI_API_KEY — la postulación queda pendiente de traducción');
    return { estado: 'pendiente', idiomaDetectado: '', traducciones: {} };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: INSTRUCCIONES },
          { role: 'user', content: JSON.stringify(conTexto) },
        ],
      }),
      // Sin esto, una demora de OpenAI deja colgado el envío del formulario.
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.error('[traducir] OpenAI respondió', res.status, await res.text().catch(() => ''));
      return { estado: 'pendiente', idiomaDetectado: '', traducciones: {} };
    }

    const data = await res.json();
    const crudo = data?.choices?.[0]?.message?.content;
    if (!crudo) return { estado: 'pendiente', idiomaDetectado: '', traducciones: {} };

    const parsed = JSON.parse(crudo) as {
      idioma?: string;
      es_espanol?: boolean;
      traducciones?: Record<string, string>;
    };

    if (parsed.es_espanol) {
      return { estado: 'no_hace_falta', idiomaDetectado: parsed.idioma || 'Español', traducciones: {} };
    }

    // Solo se aceptan campos conocidos: si el modelo devuelve otra cosa, se
    // descarta en vez de guardarla.
    const traducciones: Partial<Record<CampoAbierto, string>> = {};
    for (const c of CAMPOS_ABIERTOS) {
      const v = parsed.traducciones?.[c];
      if (typeof v === 'string' && v.trim()) traducciones[c] = v.trim();
    }

    if (Object.keys(traducciones).length === 0) {
      return { estado: 'no_hace_falta', idiomaDetectado: parsed.idioma || '', traducciones: {} };
    }

    return { estado: 'ok', idiomaDetectado: parsed.idioma || '', traducciones };
  } catch (e) {
    console.error('[traducir] falló la traducción:', e);
    return { estado: 'pendiente', idiomaDetectado: '', traducciones: {} };
  }
}

/** Aplana el resultado a las meta que guarda WordPress. */
export function metaDeTraduccion(r: ResultadoTraduccion): Record<string, string> {
  const meta: Record<string, string> = {
    traduccion_estado: r.estado,
    idioma_detectado: r.idiomaDetectado,
  };
  for (const [campo, texto] of Object.entries(r.traducciones)) {
    meta[`${campo}_es`] = texto;
  }
  return meta;
}
