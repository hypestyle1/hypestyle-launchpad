import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const RAIZ = join(__dirname, '..', '..');

import { CYBER_END, CYBER_START, cyberEstado, cyberUltimasHoras } from '@/lib/cyber-hype';
import {
  CYBER_DESTACADOS_SLUGS,
  CYBER_FILTROS,
  CYBER_DROPS,
  CYBER_MYSTERY,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
} from '@/lib/cyber-cartelera';
import { REGULAR_TEES_GROUPS, REGULAR_TEES_SLUGS } from '@/lib/regular-tees';
import { PACK_REGULAR_SLUGS } from '@/lib/promo-pack-regular';

const en = (iso: string) => new Date(iso);

/* ════════════════ 3 DÍAS · 3 DROPS — el secreto no se filtra ═══════════ */

describe('drops — lo no revelado no existe para el navegador', () => {
  it('son exactamente 3, uno por día del evento', () => {
    expect(CYBER_DROPS.map((d) => d.fecha)).toEqual(['lun 2/11', 'mar 3/11', 'mié 4/11']);
  });

  it('un drop sin producto asignado queda bloqueado aunque pase su hora', () => {
    const despues = en('2026-11-04T23:00:00-03:00');
    for (const d of dropsPublicos(despues)) {
      const original = CYBER_DROPS.find((o) => o.id === d.id)!;
      if (original.producto === null) {
        expect(d.estado).toBe('bloqueado');
        expect(d).not.toHaveProperty('producto');
      }
    }
  });

  it('antes de su revealAt un drop NUNCA viaja con producto, aunque esté asignado', () => {
    // Se prueba con una copia asignada, sin tocar la config real.
    const conProducto = CYBER_DROPS.map((d) => ({
      ...d,
      producto: { nombre: 'X', claim: 'X', img: '/x.webp', href: '/x' },
    }));
    const t = en('2026-11-02T10:59:59-03:00').getTime();
    for (const d of conProducto) {
      const revelado = d.producto !== null && t >= new Date(d.revealAt).getTime();
      if (d.id !== '01') expect(revelado).toBe(false);
    }
    // Y la función pública sobre la config real jamás inventa un producto:
    for (const d of dropsPublicos(en('2026-11-01T20:00:00-03:00'))) {
      expect(d.estado).toBe('bloqueado');
    }
  });

  it('los revealAt caen dentro de la ventana del evento', () => {
    for (const d of CYBER_DROPS) {
      const t = new Date(d.revealAt).getTime();
      expect(t).toBeGreaterThanOrEqual(new Date(CYBER_START).getTime());
      expect(t).toBeLessThan(new Date(CYBER_END).getTime());
    }
  });
});

describe('drops — el módulo de la config es SOLO del servidor', () => {
  // Si un componente 'use client' importara lib/cyber-cartelera, los títulos
  // y fotos de los drops sin revelar entrarían al bundle del navegador y el
  // secreto se leería en el JS. Este test recorre los componentes y lo frena.
  const archivos = (dir: string): string[] => {
    const out: string[] = [];
    for (const d of readdirSync(join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${d.name}`;
      if (d.isDirectory()) out.push(...archivos(rel));
      else if (/\.(ts|tsx)$/.test(d.name)) out.push(rel);
    }
    return out;
  };

  it("ningún archivo 'use client' importa lib/cyber-cartelera", () => {
    const culpables = [...archivos('components'), ...archivos('hooks'), ...archivos('app')]
      .map((f) => ({ f, src: readFileSync(join(RAIZ, f.replace(/\//g, sep)), 'utf8') }))
      .filter(({ src }) => /^\s*['"]use client['"]/.test(src))
      .filter(({ src }) => /from\s+['"]@\/lib\/cyber-cartelera['"]/.test(src))
      .map(({ f }) => f);
    expect(culpables).toEqual([]);
  });
});

/* ═══════════════════════════ MYSTERY ARCHIVE ═══════════════════════════ */

describe('mystery — espacio diseñado, no promesa activa', () => {
  it('sigue sin publicar: prenderlo es decisión comercial de Valentín', () => {
    expect(MYSTERY_PUBLICADO).toBe(false);
  });

  it('las tres categorías existen, con portada real y sin ficha hasta que exista en Woo', () => {
    expect(CYBER_MYSTERY.map((m) => m.id)).toEqual(['tees', 'tops', 'bottoms']);
    for (const m of CYBER_MYSTERY) {
      expect(m.img).toMatch(/^\/cyber\/mystery\//);
      if (!MYSTERY_PUBLICADO) expect(m.href).toBeNull();
    }
  });

  it('ningún texto de mystery lleva cifra de dinero ni porcentaje', () => {
    for (const m of CYBER_MYSTERY) {
      const texto = `${m.nombre} ${m.detalle} ${m.pool}`;
      expect(texto).not.toMatch(/\$\s?\d/);
      expect(texto).not.toMatch(/\d\s?%|%\s?\d/);
    }
  });
});

/* ══════════════════════ CATÁLOGO Y 4 PACK ══════════════════════════════ */

describe('curaduría — productos reales, nada inventado', () => {
  it('el 4 PACK se arma con Regular individuales de la fuente de verdad', () => {
    for (const slug of CYBER_PACK_SLUGS) {
      expect(REGULAR_TEES_SLUGS).toContain(slug);
    }
  });

  /**
   * Las Regular elegibles viven hoy en TRES listas separadas:
   *   - `INDIVIDUALES` en lib/regular-tees (catálogo y home),
   *   - `PACK_REGULAR_SLUGS` en lib/promo-pack-regular (el motor que COBRA),
   *   - `CYBER_PACK_SLUGS` en lib/cyber-cartelera (la sección del evento).
   * Si divergen, pasa lo peor: la sección muestra una remera que el carrito no
   * cuenta para el pack, o al revés. Este test las ata.
   *
   * Es además el candado de la **Regular Red** que se está cargando en otra
   * sesión (29/10): el día que se agregue, hay que agregarla en las tres o
   * esto falla. Checklist de activación en
   * `_claude/propuestas/CYBER-EVENTO/regular-red-integracion.md`.
   */
  it('las tres listas de Regular elegibles dicen exactamente lo mismo', () => {
    const motor = [...PACK_REGULAR_SLUGS].sort();
    const evento = [...CYBER_PACK_SLUGS].sort();
    const catalogo = [...REGULAR_TEES_GROUPS[0].slugs].sort();
    expect(evento).toEqual(motor);
    expect(catalogo).toEqual(motor);
  });

  it('ninguna grilla del evento pasa originalPrice: el tachado es un % disfrazado', () => {
    // 89 de 145 productos tienen sale_price PERMANENTE sin fecha de fin, así
    // que ese "precio anterior" nunca se transó: el 3 PACK se leería
    // "$102.000 → $66.300" y los $102.000 son 3 × $34.000, pura aritmética.
    // Mostrar el tachado es comunicar un descuento contra un precio de
    // referencia inventado, que es justo lo que la marca no hace.
    for (const f of ['components/cyber/CyberCatalogoEvento.tsx', 'components/cyber/Cyber4Pack.tsx']) {
      const src = readFileSync(join(RAIZ, f.replace(/\//g, sep)), 'utf8');
      const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
      expect(sinComentarios, f).not.toMatch(/originalPrice=/);
    }
  });

  it('los filtros cubren las categorías que facturan, incluidas Pantalón y Accesorio', () => {
    const cats = CYBER_FILTROS.flatMap((f) => f.cats);
    for (const c of ['Tee', 'Hoodie', 'Longsleeve', 'Pack', 'Pantalón', 'Accesorio']) {
      expect(cats, `falta el filtro de ${c}`).toContain(c);
    }
    // Sin ids repetidos: son las pestañas.
    const ids = CYBER_FILTROS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los destacados son slugs, sin duplicados', () => {
    expect(new Set(CYBER_DESTACADOS_SLUGS).size).toBe(CYBER_DESTACADOS_SLUGS.length);
    for (const s of CYBER_DESTACADOS_SLUGS) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});

/* ═══════════════ RESTAURACIÓN: el takeover se apaga solo ═══════════════ */

describe('restauración automática', () => {
  it('a las 00:00 del 5/11 el estado es cerrado y el takeover no se renderiza', () => {
    expect(cyberEstado(en('2026-11-05T00:00:00-03:00'))).toBe('cerrado');
  });

  it('el kill switch CYBER_APAGADO=1 fuerza cerrado aun en pleno evento', () => {
    process.env.CYBER_APAGADO = '1';
    try {
      expect(cyberEstado(en('2026-11-02T12:00:00-03:00'))).toBe('cerrado');
    } finally {
      delete process.env.CYBER_APAGADO;
    }
  });

  it('últimas horas: solo el último día, y nunca fuera del evento', () => {
    expect(cyberUltimasHoras(en('2026-11-02T12:00:00-03:00'))).toBe(false);
    expect(cyberUltimasHoras(en('2026-11-04T00:00:00-03:00'))).toBe(true);
    expect(cyberUltimasHoras(en('2026-11-05T01:00:00-03:00'))).toBe(false);
  });

  it('la home SS27 sigue intacta: el takeover es una rama, no una edición', () => {
    // El archivo de la home tiene que conservar sus secciones de siempre;
    // si alguien las borra "porque está el takeover", este test lo frena.
    const src = readFileSync(join(RAIZ, 'app', 'page.tsx'), 'utf8');
    for (const seccion of ['HeroSs27', 'Ss27Feed', 'ShopTheLook', 'EsencialesShelf', 'Fw26Shelf', 'BestSellersShelf', 'ReviewsHomeSection', 'InstagramFeed', 'Footer']) {
      expect(src).toContain(seccion);
    }
    expect(src).toContain("cyberEstado() === 'evento'");
  });
});
