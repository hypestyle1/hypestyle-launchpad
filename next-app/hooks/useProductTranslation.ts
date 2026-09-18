'use client';

import { useEffect, useState } from 'react';
import type { Language } from '@/context/LocaleContext';

// Descripción y ficha del modelo traducidas para la ficha de producto.
//
// El idioma vive en localStorage, así que el HTML servido siempre trae el
// español (y así no hay desajuste de hidratación). Recién montado, si el
// idioma no es ES, se pide la traducción a /api/producto/traduccion y se
// reemplaza el texto. Mientras llega —o si falla— se ve el español.

export interface TextosTraducidos {
  description: string;
  modelInfo: string;
}

interface Estado {
  clave: string;
  textos: TextosTraducidos | null;
  cargando: boolean;
}

// Cache de la pestaña: cambiar de idioma y volver no repite el request.
const cache = new Map<string, TextosTraducidos>();

export function useProductTranslation(slug: string | undefined, language: Language): {
  textos: TextosTraducidos | null;
  cargando: boolean;
} {
  const clave = `${slug ?? ''}|${language}`;
  const [estado, setEstado] = useState<Estado>({ clave, textos: null, cargando: false });

  useEffect(() => {
    if (!slug || language === 'ES') {
      setEstado({ clave, textos: null, cargando: false });
      return;
    }
    const hit = cache.get(clave);
    if (hit) {
      setEstado({ clave, textos: hit, cargando: false });
      return;
    }

    let vivo = true;
    setEstado({ clave, textos: null, cargando: true });
    fetch(`/api/producto/traduccion?slug=${encodeURIComponent(slug)}&lang=${language}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!vivo) return;
        const ok = data && typeof data === 'object' && typeof (data as TextosTraducidos).description === 'string';
        if (ok) {
          const textos: TextosTraducidos = {
            description: (data as TextosTraducidos).description,
            modelInfo: typeof (data as TextosTraducidos).modelInfo === 'string' ? (data as TextosTraducidos).modelInfo : '',
          };
          cache.set(clave, textos);
          setEstado({ clave, textos, cargando: false });
        } else {
          setEstado({ clave, textos: null, cargando: false });
        }
      })
      .catch(() => { if (vivo) setEstado({ clave, textos: null, cargando: false }); });

    return () => { vivo = false; };
  }, [slug, language, clave]);

  // Entre el cambio de idioma y el efecto, el estado es del idioma anterior:
  // no hay que mostrar la traducción vieja con el idioma nuevo.
  if (estado.clave !== clave) return { textos: null, cargando: language !== 'ES' };
  return { textos: estado.textos, cargando: estado.cargando };
}
