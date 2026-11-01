import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const RAIZ = join(__dirname, '..', '..');

import { CYBER_END, CYBER_START, cyberEstado, cyberUltimasHoras } from '@/lib/cyber-hype';
import {
  CYBER_DESTACADOS_SLUGS,
  CYBER_FILTROS,
  CYBER_DROPS,
  CYBER_MYSTERY,
  CYBER_MYSTERY_EN_VIDRIERA,
  CYBER_PACK_SLUGS,
  MYSTERY_PUBLICADO,
  dropsPublicos,
} from '@/lib/cyber-cartelera';
import { MYSTERY_CAJAS } from '@/lib/mystery';
import { REGULAR_TEES_GROUPS, REGULAR_TEES_SLUGS } from '@/lib/regular-tees';
import { PACK_REGULAR_SLUGS } from '@/lib/promo-pack-regular';

const en = (iso: string) => new Date(iso);

/* ════════════════ 3 DÍAS · 3 DROPS — el secreto no se filtra ═══════════ */

describe('drops — lo no revelado no existe para el navegador', () => {
  it('son exactamente 3, uno por día del evento', () => {
    expect(CYBER_DROPS.map((d) => d.fecha)).toEqual(['lun 2/11', 'mar 3/11', 'mié 4/11']);
  });

  it('un drop sin producto asignado NUNCA se revela, aunque pase su hora', () => {
    const despues = en('2026-11-04T23:00:00-03:00');
    for (const d of dropsPublicos(despues)) {
      const original = CYBER_DROPS.find((o) => o.id === d.id)!;
      if (original.producto === null) {
        // Puede ser 'teaser' (portada aprobada, sin productos) o 'bloqueado',
        // pero jamás 'revelado' ni con producto encima.
        expect(d.estado).not.toBe('revelado');
        expect(d).not.toHaveProperty('producto');
      }
    }
  });

  it('un drop bloqueado no lleva ninguna imagen', () => {
    for (const d of dropsPublicos(en('2026-11-02T12:00:00-03:00'))) {
      if (d.estado !== 'bloqueado') continue;
      expect(d).not.toHaveProperty('producto');
    }
  });

  it('en public/ solo hay portadas de drops asignados, y las veladas son irrecuperables', () => {
    // Un archivo servido se adivina por la URL: subir la portada del Camo sin
    // velar sería spoilear el drop aunque no apareciera en el HTML.
    const dir = join(RAIZ, 'public', 'cyber', 'drops');
    const subidas = readdirSync(dir);
    const permitidas = CYBER_DROPS.flatMap((d) =>
      [d.producto?.img, d.velada].filter(Boolean).map((p) => p!.split('/').pop()!),
    );
    expect(subidas.sort()).toEqual(permitidas.sort());

    // Una velada pesa una fracción del original: el desenfoque se come el detalle
    // y el archivo se desploma. Si alguien sube la foto
    // buena con ese nombre, este test lo frena.
    for (const d of CYBER_DROPS) {
      if (!d.velada) continue;
      const bytes = statSync(join(RAIZ, 'public', ...d.velada.split('/').filter(Boolean))).size;
      expect(bytes, `${d.velada} pesa ${bytes} bytes: ¿está realmente velada?`).toBeLessThan(20480);
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
    // Y la función pública sobre la config real solo revela lo que de verdad
    // tiene producto Y ya cumplió su hora. Nada más puede traer `producto`.
    for (const ahora of ['2026-11-01T19:59:59-03:00', '2026-11-01T20:00:00-03:00', '2026-11-03T12:00:00-03:00']) {
      for (const d of dropsPublicos(en(ahora))) {
        const o = CYBER_DROPS.find((x) => x.id === d.id)!;
        const deberia = o.producto !== null && en(ahora).getTime() >= new Date(o.revealAt).getTime();
        expect(d.estado === 'revelado').toBe(deberia);
        if (!deberia) expect(d).not.toHaveProperty('producto');
      }
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

// Recorre todo components/, hooks/ y app/, así que con el dev server
// corriendo no entra en los 5 s por defecto. Mismo caso que el test de árbol
// de cyber-hype.test.ts, que ya lleva su propio timeout.
describe('drops — el módulo de la config es SOLO del servidor', { timeout: 30_000 }, () => {
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
  it('publica las tres Mystery por decisión comercial de Valentín', () => {
    expect(MYSTERY_PUBLICADO).toBe(true);
  });

  it('las tres categorías existen, con portada real, y su link y precio salen de MYSTERY_CAJAS', () => {
    // 29/10: Bottoms descartado (poco stock, talles quebrados). Las tres
    // cajas son de la parte de arriba.
    expect(CYBER_MYSTERY.map((m) => m.id)).toEqual(['tees', 'longsleeves', 'hoodies']);
    for (const m of CYBER_MYSTERY) {
      expect(m.img).toMatch(/^\/cyber\/mystery\//);
      // Una sola fuente de verdad para precio y slug: si la tarjeta y la ficha
      // se separan, el cliente ve un precio en la home y otro al entrar.
      const caja = MYSTERY_CAJAS.find((c) => c.id === m.id);
      expect(caja, `falta la caja "${m.id}" en lib/mystery.ts`).toBeDefined();
      expect(m.href).toBe(`/producto/${caja!.slug}`);
      expect(m.precio).toBe(caja!.precio);
    }
  });

  it('los tres precios aprobados el 31/10 son los que se muestran', () => {
    // Si alguno cambia, cambió una decisión comercial: que falle y se mire.
    expect(CYBER_MYSTERY.map((m) => m.precio)).toEqual([25900, 39900, 54900]);
  });

  it('mantiene los destacados aprobados con despacho manual de Mystery', () => {
    // El choque: la misma remera que puede salir en una caja sorpresa está a
    // la venta suelta dos secciones más abajo, a $38.000–40.500. Mientras
    // Mystery no esté publicado conviven sin problema (y no queremos perder
    // destacados buenos por una caja que no existe); el día que se encienda,
    // hay que elegir. Este test obliga a esa decisión en el momento justo.
    if (!MYSTERY_PUBLICADO) return;
    const choque = CYBER_DESTACADOS_SLUGS.filter((s) => CYBER_MYSTERY_EN_VIDRIERA.includes(s));
    // Lanzamiento 1/11: Valentín autoriza convivencia y organiza el despacho
    // manualmente. No modificar inventario ni retirar diseños aprobados.
    expect(choque).toEqual(['ladytribal-black-longsleeve', 'honda-white-tee']);
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

  it('la escalera de regalos publica los umbrales REALES de producción', () => {
    // Única parte de la página con cifras, y no es una excepción a la regla:
    // no son precios ni porcentajes, son umbrales de una mecánica ya viva.
    // Verificado el 29/10 contra POST /api/gift-progress del sitio publicado:
    // active true, modo "highest", 100.000 Chain / 140.000 Socks / 300.000
    // Zippo. Si alguien toca el plugin, estos números quedan desactualizados
    // y este test es el recordatorio de actualizarlos juntos.
    const src = readFileSync(
      join(RAIZ, 'components/cyber/CyberRegalos.tsx'.replace(/\//g, sep)),
      'utf8',
    );
    for (const monto of ['$100.000', '$140.000', '$300.000']) {
      expect(src, `falta el umbral ${monto}`).toContain(monto);
    }
    // El modo es "highest": NO se acumulan. Decir lo contrario sería mentir.
    expect(src).toMatch(/nivel más alto/i);
    // Y no se cuela un porcentaje por la ventana.
    const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');
    expect(sinComentarios).not.toMatch(/\d\s?%/);
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
    // La rama sigue intacta, pero ahora la decisión incluye la sesión firmada
    // durante el cierre previo a las 19:00.
    expect(src).toContain('cyberTakeoverVisible()');
  });
});
