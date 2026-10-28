import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HYPE72_ACENTO,
  HYPE72_HOME_DESDE,
  HYPE72_HOME_HASTA,
  HYPE72_HOME_PREVIA_DESDE,
  HYPE72_ORDEN_EVENTO,
  HYPE72_ORDEN_NORMAL,
  HYPE72_ORDEN_PREVIA,
  HYPE72_PRECIOS_APROBADOS,
  HYPE72_TOPBAR_EVENTO,
  HYPE72_TOPBAR_PREVIA,
  hype72Countdown,
  hype72HomeEnCurso,
  hype72HomeOrden,
  hype72HomeState,
  hype72HomeStateResuelto,
  hype72TopBarItems,
  type Hype72SeccionId,
} from '@/lib/hype72-home';
import {
  bloqueArchivo,
  bloquePacks,
  bloqueProximamente,
  hayStock,
  hype72Bloques,
  stockHolgado,
} from '@/lib/hype72-home-seleccion';
import type { NormalizedProduct } from '@/lib/products-normalize';

const ART = (iso: string) => Date.parse(iso);
const ms = 1;

describe('HYPE 72 — ventana y estado', () => {
  it('las constantes son los instantes acordados en hora argentina', () => {
    // Si alguien escribe las fechas sin offset, Vercel (UTC) las corre tres
    // horas. Estos tres asserts son el seguro contra eso.
    expect(new Date(HYPE72_HOME_PREVIA_DESDE).toISOString()).toBe('2026-10-27T14:00:00.000Z');
    expect(new Date(HYPE72_HOME_DESDE).toISOString()).toBe('2026-11-02T03:00:00.000Z');
    expect(new Date(HYPE72_HOME_HASTA).toISOString()).toBe('2026-11-05T03:00:00.000Z');
  });

  it('antes de la previa la home es la normal', () => {
    expect(hype72HomeState(ART('2026-10-20T11:00:00-03:00'))).toBe('normal');
    expect(hype72HomeState(HYPE72_HOME_PREVIA_DESDE - ms)).toBe('normal');
  });

  it('en el instante exacto del 27/10 11:00 ART arranca la previa', () => {
    expect(hype72HomeState(HYPE72_HOME_PREVIA_DESDE)).toBe('previa');
    expect(hype72HomeState(ART('2026-10-29T09:30:00-03:00'))).toBe('previa');
  });

  // ── BORDES EXACTOS ──
  it('un milisegundo antes del 2/11 00:00 ART todavía es previa', () => {
    expect(hype72HomeState(HYPE72_HOME_DESDE - ms)).toBe('previa');
    expect(hype72HomeState(ART('2026-11-01T23:59:59-03:00'))).toBe('previa');
  });

  it('en el 2/11 00:00 ART exacto arranca el evento', () => {
    expect(hype72HomeState(HYPE72_HOME_DESDE)).toBe('evento');
    expect(hype72HomeEnCurso(HYPE72_HOME_DESDE)).toBe(true);
  });

  it('el último segundo del 4/11 (23:59:59 ART) sigue en evento', () => {
    expect(hype72HomeState(ART('2026-11-04T23:59:59-03:00'))).toBe('evento');
    expect(hype72HomeState(HYPE72_HOME_HASTA - ms)).toBe('evento');
  });

  it('en el 5/11 00:00 ART exacto el evento terminó y vuelve la home normal', () => {
    expect(hype72HomeState(HYPE72_HOME_HASTA)).toBe('normal');
    expect(hype72HomeEnCurso(HYPE72_HOME_HASTA)).toBe(false);
    expect(hype72HomeState(ART('2026-11-05T00:00:01-03:00'))).toBe('normal');
    expect(hype72HomeState(ART('2027-03-01T12:00:00-03:00'))).toBe('normal');
  });

  it('la ventana publicada (2, 3 y 4 de noviembre) está entera dentro del evento', () => {
    for (const iso of [
      '2026-11-02T00:00:00-03:00',
      '2026-11-02T21:00:00-03:00',
      '2026-11-03T11:00:00-03:00',
      '2026-11-04T21:00:00-03:00',
    ]) {
      expect(hype72HomeState(ART(iso)), iso).toBe('evento');
    }
  });

  it('la hora del aviso a Mejores Amigos (1/11 23:00 a 23:59) sigue en previa', () => {
    // Se les avisa y se les muestra la cartelera, pero sin precios anticipados:
    // la home todavía no ofrece nada. Decisión del 25/10.
    expect(hype72HomeState(ART('2026-11-01T23:00:00-03:00'))).toBe('previa');
    expect(hype72HomeState(ART('2026-11-01T23:59:59-03:00'))).toBe('previa');
  });
});

describe('HYPE 72 — overrides', () => {
  it('force_off devuelve la home normal incluso en el pico del evento', () => {
    expect(hype72HomeStateResuelto(HYPE72_HOME_DESDE, { override: 'force_off' })).toBe('normal');
    expect(hype72HomeStateResuelto(ART('2026-11-03T12:00:00-03:00'), { override: 'force_off' })).toBe('normal');
  });

  it('force_off gana al preview: ante dos variables cargadas, gana la que no muestra nada', () => {
    expect(
      hype72HomeStateResuelto(ART('2026-01-01T00:00:00-03:00'), { override: 'force_off', preview: 'evento' }),
    ).toBe('normal');
  });

  it('el preview fuerza el estado sin tocar el reloj ni las constantes', () => {
    const enero = ART('2026-01-01T00:00:00-03:00');
    expect(hype72HomeStateResuelto(enero, { override: 'auto', preview: 'evento' })).toBe('evento');
    expect(hype72HomeStateResuelto(enero, { override: 'auto', preview: 'previa' })).toBe('previa');
    expect(hype72HomeStateResuelto(enero, { override: 'auto', preview: 'normal' })).toBe('normal');
  });

  it('sin overrides, resuelto === el estado de las fechas', () => {
    for (const t of [
      ART('2026-10-01T00:00:00-03:00'),
      HYPE72_HOME_PREVIA_DESDE,
      HYPE72_HOME_DESDE,
      HYPE72_HOME_HASTA,
    ]) {
      expect(hype72HomeStateResuelto(t, { override: 'auto', preview: null })).toBe(hype72HomeState(t));
    }
  });

  it('no existe force_on: el único override de producción apaga, nunca enciende', () => {
    const src = readFileSync(join(process.cwd(), 'lib/hype72-home.ts'), 'utf8');
    const fn = src.slice(src.indexOf('export function hype72HomeOverride'));
    expect(fn.slice(0, fn.indexOf('\n}'))).not.toContain('force_on');
  });
});

describe('HYPE 72 — fuera de la ventana la home NO cambia', () => {
  /**
   * EL ORDEN DE HOY, escrito a mano acá a propósito. No se importa de la lib:
   * si se importara, el test pasaría igual aunque alguien cambiara el orden de
   * la home normal, que es justo lo que hay que impedir.
   */
  const ORDEN_DE_SIEMPRE: Hype72SeccionId[] = [
    'promo-3x2',
    'flash-sale',
    'ss27-feed',
    'shop-the-look',
    'visto-en',
    'esenciales',
    'fw26',
    'best-sellers',
    'editorial-banner',
    'reviews',
    'instagram',
  ];

  it('el orden del estado normal es exactamente el de la home de siempre', () => {
    expect([...HYPE72_ORDEN_NORMAL]).toEqual(ORDEN_DE_SIEMPRE);
  });

  it('antes de la previa y después del cierre se renderiza ese mismo orden', () => {
    const fuera = [
      ART('2026-09-01T00:00:00-03:00'),
      HYPE72_HOME_PREVIA_DESDE - ms,
      HYPE72_HOME_HASTA,
      ART('2026-11-05T00:00:01-03:00'),
      ART('2027-06-01T00:00:00-03:00'),
    ];
    for (const t of fuera) {
      expect([...hype72HomeOrden(hype72HomeState(t))], new Date(t).toISOString()).toEqual(ORDEN_DE_SIEMPRE);
    }
  });

  it('fuera de la ventana no hay items propios en el top bar ni cuenta regresiva', () => {
    for (const t of [HYPE72_HOME_PREVIA_DESDE - ms, HYPE72_HOME_HASTA]) {
      const state = hype72HomeState(t);
      expect(hype72TopBarItems(state)).toBeNull();
      expect(hype72Countdown(state)).toBeNull();
    }
  });

  it('fuera de la ventana no se renderiza NINGUNA sección del evento', () => {
    const delEvento = (ids: readonly Hype72SeccionId[]) => ids.filter((i) => i.startsWith('hype72-'));
    expect(delEvento(hype72HomeOrden('normal'))).toEqual([]);
  });

  it('la previa no reordena nada: es la home de siempre más la banda', () => {
    expect([...HYPE72_ORDEN_PREVIA]).toEqual(['hype72-banda', ...ORDEN_DE_SIEMPRE]);
  });
});

describe('HYPE 72 — orden comercial del evento', () => {
  const pos = (id: Hype72SeccionId) => HYPE72_ORDEN_EVENTO.indexOf(id);

  it('las ofertas van arriba de TODO lo editorial', () => {
    const editoriales: Hype72SeccionId[] = ['shop-the-look', 'visto-en', 'editorial-banner', 'reviews', 'instagram'];
    const comerciales: Hype72SeccionId[] = [
      'hype72-regalos',
      'hype72-packs',
      'hype72-archivo',
      'hype72-sleeveless',
      'hype72-hoodies-tees',
      'hype72-populares',
    ];
    for (const e of editoriales) {
      for (const c of comerciales) {
        expect(pos(c), `${c} tiene que ir antes de ${e}`).toBeLessThan(pos(e));
      }
    }
  });

  it('la escalera de regalos va arriba de los packs (se conoce antes de armar el carrito)', () => {
    expect(pos('hype72-regalos')).toBeLessThan(pos('hype72-packs'));
  });

  it('los packs son el primer bloque de producto: el ancla comercial', () => {
    const productos: Hype72SeccionId[] = [
      'hype72-packs',
      'hype72-archivo',
      'hype72-sleeveless',
      'hype72-hoodies-tees',
      'hype72-populares',
      'hype72-proximamente',
    ];
    expect(productos.map(pos).every((p) => p >= pos('hype72-packs'))).toBe(true);
  });

  it('"próximamente" va después de todo lo comprable', () => {
    for (const c of ['hype72-packs', 'hype72-archivo', 'hype72-sleeveless', 'hype72-hoodies-tees', 'hype72-populares'] as Hype72SeccionId[]) {
      expect(pos(c)).toBeLessThan(pos('hype72-proximamente'));
    }
  });

  it('la línea de corte separa el evento de lo editorial', () => {
    expect(pos('hype72-condiciones')).toBeLessThan(pos('hype72-corte'));
    expect(pos('hype72-corte')).toBeLessThan(pos('shop-the-look'));
  });

  it('los estantes de siempre no se repiten durante el evento', () => {
    for (const id of ['esenciales', 'fw26', 'best-sellers'] as Hype72SeccionId[]) {
      expect(HYPE72_ORDEN_EVENTO).not.toContain(id);
    }
  });

  it('ninguna sección aparece dos veces en el mismo estado', () => {
    for (const orden of [HYPE72_ORDEN_NORMAL, HYPE72_ORDEN_PREVIA, HYPE72_ORDEN_EVENTO]) {
      expect(new Set(orden).size).toBe(orden.length);
    }
  });
});

describe('HYPE 72 — la home renderiza desde el orden, no desde el JSX', () => {
  const page = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');

  it('app/page.tsx mapea hype72HomeOrden', () => {
    expect(page).toContain('hype72HomeOrden(hype72).map(');
  });

  it('cada id de cada estado tiene una sección definida en app/page.tsx', () => {
    const ids = new Set<Hype72SeccionId>([
      ...HYPE72_ORDEN_NORMAL,
      ...HYPE72_ORDEN_PREVIA,
      ...HYPE72_ORDEN_EVENTO,
    ]);
    for (const id of ids) {
      // En el diccionario SECCIONES las claves con guion van entre comillas.
      const clave = id.includes('-') ? `'${id}':` : `${id}:`;
      expect(page, `falta la sección ${id} en SECCIONES`).toContain(clave);
    }
  });

  it('la home declara revalidate: el estado depende de la hora del servidor', () => {
    expect(page).toMatch(/export const revalidate = 60/);
  });

  it('el cuerpo se envuelve en Fragment, para no cambiar el DOM fuera de la ventana', () => {
    expect(page).toContain('<Fragment key={id}>');
    expect(page).not.toContain('className="contents"');
  });
});

describe('HYPE 72 — reglas duras de contenido', () => {
  const fuentes = [
    'lib/hype72-home.ts',
    'lib/hype72-home-seleccion.ts',
    'components/home/hype72/Hype72Banda.tsx',
    'components/home/hype72/Hype72Regalos.tsx',
    'components/home/hype72/Hype72Shelf.tsx',
    'components/home/hype72/Hype72Corte.tsx',
    'components/home/hype72/Hype72MiniCountdown.tsx',
  ];
  const leer = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
  /** Sin comentarios: ahí sí se documentan los montos pendientes y el por qué. */
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const announcementBar = leer('components/AnnouncementBar.tsx');
  /**
   * Las condiciones de siempre del sitio (envío gratis, cuotas, cambios) se
   * copian del marquee tal cual, porque durante la previa el marquee es lo
   * único que las muestra. Esas NO son copy del evento: son condiciones ya
   * publicadas y verificadas, idénticas a las de `AnnouncementBar`.
   */
  const esDeSiempre = (item: string) => announcementBar.includes(item);
  /** El copy que el evento AGREGA: lo único a lo que aplican las reglas duras. */
  const copyVisible = [
    ...HYPE72_TOPBAR_PREVIA.filter((i) => !esDeSiempre(i)),
    ...HYPE72_TOPBAR_EVENTO.filter((i) => !esDeSiempre(i)),
    ...fuentes.filter((f) => f.endsWith('.tsx')).map((f) => sinComentarios(leer(f))),
  ].join('\n');

  it('sin aprobación el interruptor de montos está apagado', () => {
    expect(HYPE72_PRECIOS_APROBADOS).toBe(false);
  });

  it('sin aprobación el takeover no escribe NI UN MONTO', () => {
    // Nada tipo "$66.300", "$ 99000", "66.300", "99000".
    expect(copyVisible).not.toMatch(/\$\s?\d/);
    expect(copyVisible).not.toMatch(/\b\d{2,3}[.,]\d{3}\b/);
    expect(copyVisible).not.toMatch(/\b\d{5,}\b/);
  });

  it('PROHIBIDO mostrar porcentajes de descuento', () => {
    // 89 de 145 productos tienen sale_price permanente: el "precio de lista"
    // no es un precio transado y un % contra él es un precio de referencia
    // manipulado. Se comunica por precio final y por el regalo.
    expect(copyVisible).not.toMatch(/\d\s?%/);
    expect(copyVisible).not.toMatch(/\b(descuento|off|rebaja|liquidaci[oó]n)\b/i);
  });

  it('las cards del takeover no muestran ni el % ni el precio de lista tachado', () => {
    // El `badge` del catálogo es SIEMPRE el porcentaje (−35%) y va pintado con
    // bg-sale; `originalPrice` es el tachado. Los dos se apagan en el estante.
    const shelf = leer('components/home/hype72/Hype72Shelf.tsx');
    expect(shelf).toContain('badge={undefined}');
    expect(shelf).toContain('originalPrice={undefined}');
    expect(shelf).toContain('mutedPrice');
  });

  it('cada monto del top bar es una condición ya publicada, no una cifra del evento', () => {
    for (const item of [...HYPE72_TOPBAR_PREVIA, ...HYPE72_TOPBAR_EVENTO]) {
      if (!/\$|\d{3}/.test(item)) continue;
      expect(esDeSiempre(item), `"${item}" tiene una cifra que no está en AnnouncementBar`).toBe(true);
    }
  });

  it('no se nombra Cyber Monday ni CACE en el copy (en los comentarios sí, para explicar que NO lo es)', () => {
    for (const f of fuentes) {
      const codigo = sinComentarios(leer(f)).toLowerCase();
      expect(codigo, f).not.toContain('cyber');
      expect(codigo, f).not.toContain('cace');
    }
  });

  it('sin emojis', () => {
    expect(copyVisible).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it('sin construcciones "No te..."', () => {
    expect(copyVisible).not.toMatch(/\bno\s+te\b/i);
  });

  it('el acento del evento es un token propio y NO toca el rojo --sale', () => {
    expect(HYPE72_ACENTO).toBe('#FF4A00');
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain('--hype72-acento: #FF4A00');
    // El rojo de campaña queda como estaba.
    expect(css).toContain('--sale: 4 71% 44%');
    for (const f of fuentes) {
      expect(leer(f), f).not.toMatch(/var\(--sale\)|hsl\(var\(--sale/);
    }
  });

  it('la palabra HYPE sale del wordmark oficial, no re-tipografiada', () => {
    const banda = leer('components/home/hype72/Hype72Banda.tsx');
    expect(banda).toContain('/hype-wordmark.svg');
    // El "72" sí se compone tipográficamente; "HYPE" como texto suelto, no.
    expect(banda.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')).not.toMatch(/>\s*HYPE\s*</);
  });

  it('con el interruptor apagado la escalera no monta GiftProgressBar', () => {
    const regalos = leer('components/home/hype72/Hype72Regalos.tsx');
    expect(regalos).toContain('HYPE72_PRECIOS_APROBADOS && (');
    // Y la sección sí dice de qué se trata, sin umbrales.
    expect(regalos).toContain('Regalo por compra');
  });

  it('el top bar del evento no promete nada sin verificar', () => {
    expect(HYPE72_TOPBAR_EVENTO.join(' ')).toContain('HYPE 72');
    expect(hype72TopBarItems('evento')).toEqual(HYPE72_TOPBAR_EVENTO);
    expect(hype72TopBarItems('previa')).toEqual(HYPE72_TOPBAR_PREVIA);
  });
});

describe('HYPE 72 — cuenta regresiva', () => {
  it('en la previa apunta a la apertura; en el evento, al cierre', () => {
    expect(hype72Countdown('previa')).toEqual({ target: HYPE72_HOME_DESDE, label: 'Arranca en' });
    expect(hype72Countdown('evento')).toEqual({ target: HYPE72_HOME_HASTA, label: 'Termina en' });
    expect(hype72Countdown('normal')).toBeNull();
  });

  it('el target es un número: tiene que cruzar el borde servidor → cliente', () => {
    expect(typeof hype72Countdown('evento')!.target).toBe('number');
  });
});

// ─── Selección de producto ──────────────────────────────────────────────────

const prod = (p: Partial<NormalizedProduct> & { slug: string }): NormalizedProduct => ({
  id: p.slug,
  name: p.slug,
  slug: p.slug,
  category: 'Tee',
  price: 50000,
  image: '',
  images: [],
  sizes: ['M'],
  stock: { M: 'ok' },
  tags: [],
  ...p,
} as NormalizedProduct);

describe('HYPE 72 — selección de producto', () => {
  it('hayStock: alcanza con un talle comprable', () => {
    expect(hayStock(prod({ slug: 'a', stock: { S: 'out', M: 'low' } }))).toBe(true);
    expect(hayStock(prod({ slug: 'b', stock: { S: 'out', M: 'out' } }))).toBe(false);
  });

  it('stockHolgado: todos los talles cómodos', () => {
    expect(stockHolgado(prod({ slug: 'a', stock: { S: 'ok', M: 'ok' } }))).toBe(true);
    expect(stockHolgado(prod({ slug: 'b', stock: { S: 'ok', M: 'low' } }))).toBe(false);
    expect(stockHolgado(prod({ slug: 'c', stock: {} }))).toBe(false);
  });

  it('los packs salen de la curaduría que ya existe, en ese orden', () => {
    const catalogo = [
      prod({ slug: 'regular-tee-black', category: 'Tee' }),
      prod({ slug: 'regular-tees-3-pack-black-white-melange', category: 'Pack' }),
      prod({ slug: 'pack-nuevo-del-evento', category: 'Pack' }),
    ];
    const slugs = bloquePacks(catalogo).map((p) => p.slug);
    // El surtido primero (mayor ticket), la individual después, y el pack que
    // no está en la lista curada entra igual, al final: un producto nuevo del
    // drop no se queda afuera por no haber tocado el código.
    expect(slugs.indexOf('regular-tees-3-pack-black-white-melange')).toBeLessThan(slugs.indexOf('regular-tee-black'));
    expect(slugs).toContain('pack-nuevo-del-evento');
  });

  it('archivo = lo que no tiene tag de temporada vigente', () => {
    const catalogo = [
      prod({ slug: 'viejo' }),
      prod({ slug: 'nuevo', tags: ['new-in'] }),
      prod({ slug: 'del-drop', tags: ['ss27-part-01'] }),
      prod({ slug: 'fw', tags: ['fw26'] }),
      prod({ slug: 'un-pack', category: 'Pack' }),
      prod({ slug: 'una-gorra', category: 'Accesorio' }),
      prod({ slug: 'agotado', stock: { M: 'out' } }),
    ];
    expect(bloqueArchivo(catalogo).map((p) => p.slug)).toEqual(['viejo']);
  });

  it('próximamente = tag de Woo, y no aparece en ningún otro bloque', () => {
    const catalogo = [
      prod({ slug: 'ya-sale', tags: ['proximamente'] }),
      prod({ slug: 'comprable' }),
    ];
    expect(bloqueProximamente(catalogo).map((p) => p.slug)).toEqual(['ya-sale']);
    const b = hype72Bloques(catalogo);
    for (const key of ['packs', 'archivo', 'sleeveless', 'hoodiesTees', 'populares'] as const) {
      expect(b[key].map((p) => p.slug), key).not.toContain('ya-sale');
    }
  });

  it('ningún producto se repite entre los bloques comprables', () => {
    const catalogo = [
      prod({ slug: 'regular-tee-black' }),
      prod({ slug: 'regular-tees-3-pack-black', category: 'Pack' }),
      prod({ slug: 'sleeveless-ranglan-white' }),
      prod({ slug: 'un-hoodie', category: 'Hoodie', tags: ['ss27-part-01'] }),
      prod({ slug: 'find-jesus-longsleeve-black', category: 'Longsleeve' }),
      prod({ slug: 'viejo-cualquiera' }),
      prod({ slug: 'race-tee' }),
    ];
    const b = hype72Bloques(catalogo);
    const todos = [...b.packs, ...b.archivo, ...b.sleeveless, ...b.hoodiesTees, ...b.populares].map((p) => p.slug);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it('"lo más pedido" no se queda vacío: la curaduría reparte antes que los filtros amplios', () => {
    // Regresión real (25/10): repartiendo en orden de pantalla, archivo,
    // sleeveless y hoodies/tees se comían los slugs curados y la sección
    // desaparecía del home del evento.
    const catalogo = [
      prod({ slug: 'find-jesus-longsleeve-black', category: 'Longsleeve' }), // best seller, sin tag de temporada
      prod({ slug: 'race-tee' }),                                            // best seller
      prod({ slug: 'otro-viejo-cualquiera' }),                               // archivo puro
    ];
    const b = hype72Bloques(catalogo);
    expect(b.populares.map((p) => p.slug)).toEqual(['find-jesus-longsleeve-black', 'race-tee']);
    expect(b.archivo.map((p) => p.slug)).toEqual(['otro-viejo-cualquiera']);
  });

  it('con catálogo vacío ningún bloque explota y todos vienen vacíos', () => {
    const b = hype72Bloques([]);
    for (const key of ['packs', 'archivo', 'sleeveless', 'hoodiesTees', 'populares', 'proximamente'] as const) {
      expect(b[key], key).toEqual([]);
    }
  });

  it('nunca se muestra algo agotado', () => {
    const catalogo = [
      prod({ slug: 'regular-tee-black', stock: { M: 'out' } }),
      prod({ slug: 'viejo-agotado', stock: { S: 'out', M: 'out' } }),
    ];
    const b = hype72Bloques(catalogo);
    expect([...b.packs, ...b.archivo, ...b.sleeveless, ...b.hoodiesTees, ...b.populares]).toEqual([]);
  });
});
