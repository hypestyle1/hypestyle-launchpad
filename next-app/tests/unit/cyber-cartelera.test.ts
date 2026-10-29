import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const RAIZ = join(__dirname, '..', '..');

import { CYBER_END, CYBER_START, cyberEstado, cyberUltimasHoras } from '@/lib/cyber-hype';
import {
  CYBER_DESTACADOS_SLUGS,
  CYBER_DROPS,
  CYBER_MYSTERY,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
} from '@/lib/cyber-cartelera';
import { REGULAR_TEES_SLUGS } from '@/lib/regular-tees';

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
  it('el 4 PACK se arma con las 4 Regular individuales de la fuente de verdad', () => {
    for (const slug of CYBER_PACK_SLUGS) {
      expect(REGULAR_TEES_SLUGS).toContain(slug);
    }
    expect(CYBER_PACK_SLUGS).toHaveLength(4);
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
